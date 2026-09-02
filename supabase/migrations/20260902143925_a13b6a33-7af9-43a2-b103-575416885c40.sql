ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS checked_out_at timestamp with time zone;

CREATE POLICY "Registration staff can update attendance" ON public.attendance FOR UPDATE TO authenticated USING (public.can_register(auth.uid())) WITH CHECK (public.can_register(auth.uid()));