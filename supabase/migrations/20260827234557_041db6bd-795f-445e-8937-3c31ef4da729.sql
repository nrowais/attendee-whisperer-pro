REVOKE EXECUTE ON FUNCTION public.check_flight_alerts(integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.can_edit(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public;

GRANT EXECUTE ON FUNCTION public.check_flight_alerts(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.can_edit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;