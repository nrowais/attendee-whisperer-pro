CREATE TABLE public.verification_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  position TEXT,
  organization TEXT,
  notes TEXT,
  batch_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_list TO authenticated;
GRANT ALL ON public.verification_list TO service_role;

ALTER TABLE public.verification_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verification_list_select" ON public.verification_list
FOR SELECT TO authenticated USING (true);

CREATE POLICY "verification_list_insert" ON public.verification_list
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

CREATE POLICY "verification_list_update" ON public.verification_list
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

CREATE POLICY "verification_list_delete" ON public.verification_list
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'coordinator'));

CREATE INDEX idx_verification_list_name ON public.verification_list (full_name);

CREATE TRIGGER update_verification_list_updated_at
BEFORE UPDATE ON public.verification_list
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();