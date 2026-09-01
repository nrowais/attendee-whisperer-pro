ALTER TABLE public.transport_trips
  ADD COLUMN IF NOT EXISTS ticket_no integer,
  ADD COLUMN IF NOT EXISTS actual_pickup_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_dropoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS passengers integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS ticket_notes text;

CREATE SEQUENCE IF NOT EXISTS public.transport_ticket_seq START 1000;

UPDATE public.transport_trips
SET ticket_no = nextval('public.transport_ticket_seq')
WHERE ticket_no IS NULL;

ALTER TABLE public.transport_trips
  ALTER COLUMN ticket_no SET DEFAULT nextval('public.transport_ticket_seq');

CREATE UNIQUE INDEX IF NOT EXISTS transport_trips_ticket_no_key
  ON public.transport_trips (ticket_no);

GRANT USAGE, SELECT ON SEQUENCE public.transport_ticket_seq TO authenticated;
GRANT ALL ON SEQUENCE public.transport_ticket_seq TO service_role;