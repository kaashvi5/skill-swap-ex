
-- 1. Certificate tamper-proof chain
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS chain_index bigint,
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS cert_hash text,
  ADD COLUMN IF NOT EXISTS verify_code text;

CREATE OR REPLACE FUNCTION public.certificates_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev record;
  payload text;
BEGIN
  SELECT chain_index, cert_hash INTO prev
  FROM public.certificates
  WHERE cert_hash IS NOT NULL
  ORDER BY chain_index DESC
  LIMIT 1;

  NEW.chain_index := COALESCE(prev.chain_index, 0) + 1;
  NEW.prev_hash := COALESCE(prev.cert_hash, repeat('0', 64));
  payload := NEW.chain_index::text || '|' || NEW.prev_hash || '|' || NEW.swap_id::text || '|' ||
             NEW.learner_id::text || '|' || NEW.teacher_id::text || '|' || NEW.skill || '|' ||
             to_char(COALESCE(NEW.issued_at, now()) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SSZ');
  NEW.cert_hash := encode(sha256(convert_to(payload, 'UTF8')), 'hex');
  NEW.verify_code := 'SS-' || upper(substr(NEW.cert_hash, 1, 4) || '-' || substr(NEW.cert_hash, 5, 4) || '-' || substr(NEW.cert_hash, 9, 4));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_certificates_chain ON public.certificates;
CREATE TRIGGER trg_certificates_chain
BEFORE INSERT ON public.certificates
FOR EACH ROW EXECUTE FUNCTION public.certificates_chain();

-- backfill existing certificates into the chain, oldest first
DO $$
DECLARE
  c record;
  prev_h text;
  idx bigint := 0;
  payload text;
  h text;
BEGIN
  prev_h := repeat('0', 64);
  FOR c IN SELECT * FROM public.certificates ORDER BY issued_at, id LOOP
    idx := idx + 1;
    payload := idx::text || '|' || prev_h || '|' || c.swap_id::text || '|' || c.learner_id::text || '|' ||
               c.teacher_id::text || '|' || c.skill || '|' ||
               to_char(c.issued_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SSZ');
    h := encode(sha256(convert_to(payload, 'UTF8')), 'hex');
    UPDATE public.certificates
      SET chain_index = idx, prev_hash = prev_h, cert_hash = h,
          verify_code = 'SS-' || upper(substr(h,1,4) || '-' || substr(h,5,4) || '-' || substr(h,9,4))
    WHERE id = c.id;
    prev_h := h;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_cert_hash_key ON public.certificates (cert_hash);
CREATE UNIQUE INDEX IF NOT EXISTS certificates_verify_code_key ON public.certificates (verify_code);

-- public verification (no login needed), exposes only non-sensitive fields
CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE (
  valid boolean,
  skill text,
  learner_name text,
  teacher_name text,
  issued_at timestamptz,
  cert_hash text,
  prev_hash text,
  chain_index bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true,
         c.skill,
         lp.full_name,
         tp.full_name,
         c.issued_at,
         c.cert_hash,
         c.prev_hash,
         c.chain_index
  FROM public.certificates c
  LEFT JOIN public.profiles lp ON lp.user_id = c.learner_id
  LEFT JOIN public.profiles tp ON tp.user_id = c.teacher_id
  WHERE upper(trim(_code)) IN (upper(c.verify_code), upper(c.cert_hash))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 2. Demo members flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
UPDATE public.profiles p SET is_demo = true
FROM auth.users u
WHERE u.id = p.user_id AND u.email LIKE '%.sw@gmail.com';

-- 3. Public (non-sensitive) activity feed for any member profile
CREATE OR REPLACE FUNCTION public.public_activity(_user_id uuid)
RETURNS TABLE (
  kind text,
  skill text,
  partner_name text,
  happened_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT 'certificate'::text AS kind, c.skill,
           tp.full_name AS partner_name, c.issued_at AS happened_at
    FROM public.certificates c
    LEFT JOIN public.profiles tp ON tp.user_id = c.teacher_id
    WHERE c.learner_id = _user_id
    UNION ALL
    SELECT 'swap'::text,
           CASE WHEN s.requester_id = _user_id THEN s.request_skill ELSE s.offer_skill END,
           op.full_name,
           s.updated_at
    FROM public.swap_requests s
    LEFT JOIN public.profiles op
      ON op.user_id = CASE WHEN s.requester_id = _user_id THEN s.recipient_id ELSE s.requester_id END
    WHERE s.status = 'completed' AND (_user_id IN (s.requester_id, s.recipient_id))
    UNION ALL
    SELECT 'rating'::text, NULL, rp.full_name, r.created_at
    FROM public.ratings r
    LEFT JOIN public.profiles rp ON rp.user_id = r.rater_id
    WHERE r.ratee_id = _user_id
  ) t
  WHERE auth.uid() IS NOT NULL
  ORDER BY happened_at DESC
  LIMIT 15;
$$;

REVOKE ALL ON FUNCTION public.public_activity(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_activity(uuid) TO authenticated;

-- 4. Owner bootstrap: the first signed-in user to claim ownership becomes admin
CREATE OR REPLACE FUNCTION public.claim_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN public.has_role(auth.uid(), 'admin');
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_owner() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_owner() TO authenticated;
