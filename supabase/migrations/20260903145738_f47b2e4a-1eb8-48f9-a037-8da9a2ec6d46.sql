CREATE POLICY "transport_trips_admin_delete" ON public.transport_trips
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));