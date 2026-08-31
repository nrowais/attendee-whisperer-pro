ALTER TABLE public.speaker_arrivals ADD COLUMN IF NOT EXISTS terminal text;
ALTER TABLE public.speaker_departures ADD COLUMN IF NOT EXISTS terminal text;

CREATE TABLE public.guest_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  speaker_id uuid NOT NULL REFERENCES public.speakers(id) ON DELETE CASCADE,
  operational_status text NOT NULL DEFAULT 'scheduled',
  arrival_actual_time timestamptz,
  airport_received_at timestamptz,
  transport_departed_at timestamptz,
  hotel_arrived_at timestamptz,
  hotel_checkin_at timestamptz,
  event_arrived_at timestamptz,
  departure_actual_time timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (speaker_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_operations TO authenticated;
GRANT ALL ON public.guest_operations TO service_role;

ALTER TABLE public.guest_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY guest_operations_read ON public.guest_operations FOR SELECT TO authenticated USING (true);
CREATE POLICY guest_operations_write ON public.guest_operations FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.guest_operations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();