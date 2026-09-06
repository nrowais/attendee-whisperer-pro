CREATE TABLE public.dinner_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  position text,
  organization text,
  notes text,
  batch_label text,
  status text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  confirmed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dinner_guests_status_check CHECK (status IN ('pending','confirmed','declined'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dinner_guests TO authenticated;
GRANT ALL ON public.dinner_guests TO service_role;

ALTER TABLE public.dinner_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dinner_guests_select" ON public.dinner_guests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dinner_guests_insert" ON public.dinner_guests
  FOR INSERT TO authenticated WITH CHECK (public.can_register(auth.uid()));

CREATE POLICY "dinner_guests_update" ON public.dinner_guests
  FOR UPDATE TO authenticated USING (public.can_register(auth.uid())) WITH CHECK (public.can_register(auth.uid()));

CREATE POLICY "dinner_guests_delete" ON public.dinner_guests
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

CREATE TRIGGER update_dinner_guests_updated_at
  BEFORE UPDATE ON public.dinner_guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();