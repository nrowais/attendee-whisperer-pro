ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
ALTER FUNCTION public.can_edit(uuid) SECURITY INVOKER;
ALTER FUNCTION public.can_register(uuid) SECURITY INVOKER;
ALTER FUNCTION public.can_update_ops(uuid) SECURITY INVOKER;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE ALL ON FUNCTION public.notify_status_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_status_change() FROM anon;
REVOKE ALL ON FUNCTION public.notify_status_change() FROM authenticated;