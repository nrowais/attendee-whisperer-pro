ALTER TABLE public.flights
  ADD COLUMN IF NOT EXISTS live_status text,
  ADD COLUMN IF NOT EXISTS live_delay_minutes integer,
  ADD COLUMN IF NOT EXISTS live_actual_arrival timestamp with time zone,
  ADD COLUMN IF NOT EXISTS live_actual_departure timestamp with time zone,
  ADD COLUMN IF NOT EXISTS live_gate text,
  ADD COLUMN IF NOT EXISTS live_terminal text,
  ADD COLUMN IF NOT EXISTS live_last_synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS live_data jsonb;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage app settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();