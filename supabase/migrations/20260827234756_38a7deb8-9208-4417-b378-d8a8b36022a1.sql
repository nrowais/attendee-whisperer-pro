REVOKE EXECUTE ON FUNCTION public.can_edit(uuid) FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.can_edit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;