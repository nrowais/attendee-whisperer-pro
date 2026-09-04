DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read_own_or_admin ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'coordinator')
);