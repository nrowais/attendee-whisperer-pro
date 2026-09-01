ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operator';

CREATE OR REPLACE FUNCTION public.can_update_ops(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','coordinator','operator')
  )
$$;

CREATE POLICY "guest_operations_ops_update" ON public.guest_operations
FOR UPDATE TO authenticated
USING (public.can_update_ops(auth.uid()))
WITH CHECK (public.can_update_ops(auth.uid()));

CREATE POLICY "guest_operations_ops_insert" ON public.guest_operations
FOR INSERT TO authenticated
WITH CHECK (public.can_update_ops(auth.uid()));

CREATE POLICY "transport_trips_ops_update" ON public.transport_trips
FOR UPDATE TO authenticated
USING (public.can_update_ops(auth.uid()))
WITH CHECK (public.can_update_ops(auth.uid()));

CREATE POLICY "hotel_bookings_ops_update" ON public.hotel_bookings
FOR UPDATE TO authenticated
USING (public.can_update_ops(auth.uid()))
WITH CHECK (public.can_update_ops(auth.uid()));