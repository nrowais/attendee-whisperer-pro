REVOKE EXECUTE ON FUNCTION public.check_flight_alerts(integer) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_flight_alerts(integer) TO service_role;