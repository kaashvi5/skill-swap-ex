ALTER TABLE public.swap_requests
  ADD COLUMN IF NOT EXISTS requester_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recipient_completed boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.confirm_swap_completion(_swap_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    INSERT INTO public.certificates (swap_id, learner_id, teacher_id, skill)
    SELECT s.id, s.requester_id, s.recipient_id, s.request_skill
    WHERE NOT EXISTS (SELECT 1 FROM public.certificates c WHERE c.swap_id = s.id);

    RETURN 'completed';
  END IF;

  RETURN 'waiting';
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_swap_completion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_swap_completion(uuid) TO authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;