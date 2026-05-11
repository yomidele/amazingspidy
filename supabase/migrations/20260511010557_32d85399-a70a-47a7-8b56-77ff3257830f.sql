
REVOKE EXECUTE ON FUNCTION public.verify_admin_pin(text, int, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_secure_session(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_secure_session(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_secure_access(text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_secure_stats(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_admin_pin(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.verify_admin_pin(text, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_secure_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_secure_session(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_secure_access(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secure_stats(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_admin_pin(text) TO authenticated;
