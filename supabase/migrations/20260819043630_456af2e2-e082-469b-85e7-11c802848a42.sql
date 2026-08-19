-- 1. Certificates: only for completed swaps between the learner and named teacher
DROP POLICY IF EXISTS "Learner creates certificate" ON public.certificates;
CREATE POLICY "Learner creates certificate"
ON public.certificates FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = learner_id
  AND EXISTS (
    SELECT 1 FROM public.swap_requests s
    WHERE s.id = certificates.swap_id
      AND s.status = 'completed'::swap_status
      AND (
        (s.requester_id = certificates.learner_id AND s.recipient_id = certificates.teacher_id)
        OR (s.recipient_id = certificates.learner_id AND s.requester_id = certificates.teacher_id)
      )
  )
);

-- 2. Profiles: private account fields (credits) only visible to owner
DROP POLICY IF EXISTS "Profiles viewable by authenticated" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = off) AS
SELECT user_id, full_name, avatar_url, bio, country, city, trust_score, ratings_count, created_at
FROM public.profiles;

REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;

-- 3. SECURITY DEFINER / trigger functions should not be callable from the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_trust_score() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;