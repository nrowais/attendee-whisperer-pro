ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'field_staff';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'registration';

CREATE OR REPLACE FUNCTION public.can_update_ops(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','coordinator','operator','field_staff')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_register(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin','coordinator','registration')
  )
$$;

CREATE POLICY "invitees_registration_insert" ON public.invitees
  FOR INSERT TO authenticated WITH CHECK (public.can_register(auth.uid()));
CREATE POLICY "invitees_registration_update" ON public.invitees
  FOR UPDATE TO authenticated USING (public.can_register(auth.uid())) WITH CHECK (public.can_register(auth.uid()));

CREATE POLICY "invitations_registration_insert" ON public.invitations
  FOR INSERT TO authenticated WITH CHECK (public.can_register(auth.uid()));
CREATE POLICY "invitations_registration_update" ON public.invitations
  FOR UPDATE TO authenticated USING (public.can_register(auth.uid())) WITH CHECK (public.can_register(auth.uid()));

CREATE POLICY "attendance_registration_insert" ON public.attendance
  FOR INSERT TO authenticated WITH CHECK (public.can_register(auth.uid()));
CREATE POLICY "attendance_registration_update" ON public.attendance
  FOR UPDATE TO authenticated USING (public.can_register(auth.uid())) WITH CHECK (public.can_register(auth.uid()));

CREATE POLICY "hotel_bookings_ops_insert" ON public.hotel_bookings
  FOR INSERT TO authenticated WITH CHECK (public.can_update_ops(auth.uid()));
CREATE POLICY "transport_trips_ops_insert" ON public.transport_trips
  FOR INSERT TO authenticated WITH CHECK (public.can_update_ops(auth.uid()));