GRANT EXECUTE ON FUNCTION public.can_edit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;