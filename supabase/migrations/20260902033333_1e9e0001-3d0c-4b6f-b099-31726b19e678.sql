
REVOKE ALL ON FUNCTION public.log_swap_request_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_certificate_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_session_event() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.session_conflict_count(uuid, timestamptz, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.session_conflict_count(uuid, timestamptz, integer, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.confirm_swap_completion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_swap_completion(uuid) TO authenticated;
