ALTER TABLE public.speakers
  ADD COLUMN IF NOT EXISTS flight_number text,
  ADD COLUMN IF NOT EXISTS flight_date date,
  ADD COLUMN IF NOT EXISTS departure_airport text,
  ADD COLUMN IF NOT EXISTS arrival_airport text,
  ADD COLUMN IF NOT EXISTS scheduled_departure timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_departure timestamptz,
  ADD COLUMN IF NOT EXISTS actual_departure timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_arrival timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_arrival timestamptz,
  ADD COLUMN IF NOT EXISTS actual_arrival timestamptz,
  ADD COLUMN IF NOT EXISTS flight_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS delay_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS terminal text,
  ADD COLUMN IF NOT EXISTS gate text,
  ADD COLUMN IF NOT EXISTS baggage_belt text,
  ADD COLUMN IF NOT EXISTS airline text,
  ADD COLUMN IF NOT EXISTS last_flight_update timestamptz,
  ADD COLUMN IF NOT EXISTS reception_stage text,
  ADD COLUMN IF NOT EXISTS receptionist_name text,
  ADD COLUMN IF NOT EXISTS receptionist_phone text,
  ADD COLUMN IF NOT EXISTS driver_name text,
  ADD COLUMN IF NOT EXISTS vehicle_label text;

CREATE INDEX IF NOT EXISTS speakers_flight_date_idx ON public.speakers (flight_date);
CREATE INDEX IF NOT EXISTS speakers_flight_number_idx ON public.speakers (flight_number);

CREATE TABLE IF NOT EXISTS public.flight_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id uuid REFERENCES public.flights(id) ON DELETE SET NULL,
  speaker_id uuid REFERENCES public.speakers(id) ON DELETE CASCADE,
  flight_number text,
  old_status text,
  new_status text,
  old_estimated_arrival timestamptz,
  new_estimated_arrival timestamptz,
  delay_minutes integer,
  source text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.flight_status_history TO authenticated;
GRANT ALL ON public.flight_status_history TO service_role;

ALTER TABLE public.flight_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "history_select" ON public.flight_status_history;
CREATE POLICY "history_select" ON public.flight_status_history
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "history_insert" ON public.flight_status_history;
CREATE POLICY "history_insert" ON public.flight_status_history
  FOR INSERT TO authenticated WITH CHECK (public.can_update_ops(auth.uid()));

CREATE INDEX IF NOT EXISTS flight_history_speaker_idx ON public.flight_status_history (speaker_id, created_at DESC);

INSERT INTO public.app_settings (key, value)
VALUES ('flight_sync_token', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO NOTHING;