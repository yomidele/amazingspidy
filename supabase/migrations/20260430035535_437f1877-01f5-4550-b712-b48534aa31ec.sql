REVOKE EXECUTE ON FUNCTION public.investor_available_balance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.investor_available_balances() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.investor_available_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.investor_available_balances() TO authenticated;