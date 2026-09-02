
-- session status enum
DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('proposed','confirmed','declined','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.swap_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id uuid NOT NULL REFERENCES public.swap_requests(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes BETWEEN 15 AND 480),
  timezone text NOT NULL DEFAULT 'UTC',
  note text,
  status public.session_status NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.swap_sessions TO authenticated;
GRANT ALL ON public.swap_sessions TO service_role;
ALTER TABLE public.swap_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view sessions" ON public.swap_sessions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.swap_requests s WHERE s.id = swap_id AND (s.requester_id = auth.uid() OR s.recipient_id = auth.uid())));

CREATE POLICY "Participants propose sessions" ON public.swap_sessions FOR INSERT TO authenticated
WITH CHECK (proposed_by = auth.uid() AND EXISTS (
  SELECT 1 FROM public.swap_requests s WHERE s.id = swap_id AND s.status = 'accepted'
    AND (s.requester_id = auth.uid() OR s.recipient_id = auth.uid())));

CREATE POLICY "Participants update sessions" ON public.swap_sessions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.swap_requests s WHERE s.id = swap_id AND (s.requester_id = auth.uid() OR s.recipient_id = auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.swap_requests s WHERE s.id = swap_id AND (s.requester_id = auth.uid() OR s.recipient_id = auth.uid())));

CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.swap_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_swap_sessions_swap ON public.swap_sessions(swap_id);
CREATE INDEX idx_swap_sessions_start ON public.swap_sessions(starts_at);

-- audit log
CREATE TABLE public.swap_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swap_id uuid NOT NULL REFERENCES public.swap_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.swap_events TO authenticated;
GRANT ALL ON public.swap_events TO service_role;
ALTER TABLE public.swap_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view swap events" ON public.swap_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.swap_requests s WHERE s.id = swap_id AND (s.requester_id = auth.uid() OR s.recipient_id = auth.uid())));

CREATE INDEX idx_swap_events_swap ON public.swap_events(swap_id, created_at);

-- logging helpers
CREATE OR REPLACE FUNCTION public.log_swap_request_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.swap_events (swap_id, actor_id, event_type, detail)
    VALUES (NEW.id, NEW.requester_id, 'request_created',
      jsonb_build_object('offer_skill', NEW.offer_skill, 'request_skill', NEW.request_skill));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.swap_events (swap_id, actor_id, event_type, detail)
    VALUES (NEW.id, auth.uid(), 'status_' || NEW.status::text,
      jsonb_build_object('from', OLD.status::text, 'to', NEW.status::text));
  ELSIF NEW.requester_completed IS DISTINCT FROM OLD.requester_completed
     OR NEW.recipient_completed IS DISTINCT FROM OLD.recipient_completed THEN
    INSERT INTO public.swap_events (swap_id, actor_id, event_type, detail)
    VALUES (NEW.id, auth.uid(), 'completion_confirmed', '{}'::jsonb);
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_swap_request_event() FROM anon, authenticated;

CREATE TRIGGER trg_log_swap_insert AFTER INSERT ON public.swap_requests
FOR EACH ROW EXECUTE FUNCTION public.log_swap_request_event();
CREATE TRIGGER trg_log_swap_update AFTER UPDATE ON public.swap_requests
FOR EACH ROW EXECUTE FUNCTION public.log_swap_request_event();

CREATE OR REPLACE FUNCTION public.log_certificate_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.swap_events (swap_id, actor_id, event_type, detail)
  VALUES (NEW.swap_id, NEW.learner_id, 'certificate_issued',
    jsonb_build_object('skill', NEW.skill, 'learner_id', NEW.learner_id, 'teacher_id', NEW.teacher_id));
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_certificate_event() FROM anon, authenticated;

CREATE TRIGGER trg_log_certificate AFTER INSERT ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.log_certificate_event();

CREATE OR REPLACE FUNCTION public.log_session_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.swap_events (swap_id, actor_id, event_type, detail)
    VALUES (NEW.swap_id, NEW.proposed_by, 'session_proposed',
      jsonb_build_object('starts_at', NEW.starts_at, 'timezone', NEW.timezone, 'duration_minutes', NEW.duration_minutes));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.swap_events (swap_id, actor_id, event_type, detail)
    VALUES (NEW.swap_id, auth.uid(), 'session_' || NEW.status::text,
      jsonb_build_object('starts_at', NEW.starts_at, 'timezone', NEW.timezone));
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.log_session_event() FROM anon, authenticated;

CREATE TRIGGER trg_log_session_insert AFTER INSERT ON public.swap_sessions
FOR EACH ROW EXECUTE FUNCTION public.log_session_event();
CREATE TRIGGER trg_log_session_update AFTER UPDATE ON public.swap_sessions
FOR EACH ROW EXECUTE FUNCTION public.log_session_event();

-- conflict check across both participants of the swap
CREATE OR REPLACE FUNCTION public.session_conflict_count(_swap_id uuid, _starts_at timestamptz, _duration integer, _exclude uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.swap_requests%ROWTYPE;
  cnt integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO s FROM public.swap_requests WHERE id = _swap_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Swap not found'; END IF;
  IF auth.uid() <> s.requester_id AND auth.uid() <> s.recipient_id THEN RAISE EXCEPTION 'Not a participant'; END IF;

  SELECT count(*) INTO cnt
  FROM public.swap_sessions ss
  JOIN public.swap_requests sr ON sr.id = ss.swap_id
  WHERE ss.status = 'confirmed'
    AND (_exclude IS NULL OR ss.id <> _exclude)
    AND (sr.requester_id IN (s.requester_id, s.recipient_id) OR sr.recipient_id IN (s.requester_id, s.recipient_id))
    AND ss.starts_at < _starts_at + make_interval(mins => _duration)
    AND _starts_at < ss.starts_at + make_interval(mins => ss.duration_minutes);
  RETURN cnt;
END; $$;
REVOKE EXECUTE ON FUNCTION public.session_conflict_count(uuid, timestamptz, integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.session_conflict_count(uuid, timestamptz, integer, uuid) TO authenticated;

-- log credit transfer inside completion routine
CREATE OR REPLACE FUNCTION public.confirm_swap_completion(_swap_id uuid)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s public.swap_requests%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO s FROM public.swap_requests WHERE id = _swap_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Swap not found'; END IF;
  IF uid <> s.requester_id AND uid <> s.recipient_id THEN RAISE EXCEPTION 'Not a participant'; END IF;
  IF s.status = 'completed' THEN RETURN 'completed'; END IF;
  IF s.status <> 'accepted' THEN RAISE EXCEPTION 'Swap is not active'; END IF;

  IF uid = s.requester_id THEN
    UPDATE public.swap_requests SET requester_completed = true WHERE id = _swap_id;
    s.requester_completed := true;
  ELSE
    UPDATE public.swap_requests SET recipient_completed = true WHERE id = _swap_id;
    s.recipient_completed := true;
  END IF;

  IF s.requester_completed AND s.recipient_completed THEN
    UPDATE public.swap_requests SET status = 'completed' WHERE id = _swap_id;

    INSERT INTO public.user_credits (user_id, credits) VALUES (s.requester_id, 3)
      ON CONFLICT (user_id) DO NOTHING;
    INSERT INTO public.user_credits (user_id, credits) VALUES (s.recipient_id, 3)
      ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.user_credits SET credits = GREATEST(credits - 1, 0), updated_at = now()
      WHERE user_id = s.requester_id;
    UPDATE public.user_credits SET credits = credits + 1, updated_at = now()
      WHERE user_id = s.recipient_id;

    INSERT INTO public.swap_events (swap_id, actor_id, event_type, detail)
    VALUES (_swap_id, uid, 'credits_transferred',
      jsonb_build_object('from', s.requester_id, 'to', s.recipient_id, 'amount', 1));

    UPDATE public.swap_sessions SET status = 'cancelled'
      WHERE swap_id = _swap_id AND status IN ('proposed');

    INSERT INTO public.certificates (swap_id, learner_id, teacher_id, skill)
    SELECT s.id, s.requester_id, s.recipient_id, s.request_skill
    WHERE NOT EXISTS (SELECT 1 FROM public.certificates c WHERE c.swap_id = s.id);

    RETURN 'completed';
  END IF;

  RETURN 'waiting';
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.confirm_swap_completion(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_swap_completion(uuid) TO authenticated;
