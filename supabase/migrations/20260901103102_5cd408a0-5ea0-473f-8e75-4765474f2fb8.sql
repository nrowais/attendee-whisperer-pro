ALTER TABLE public.transport_trips
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS terminal text,
  ADD COLUMN IF NOT EXISTS receiver_name text,
  ADD COLUMN IF NOT EXISTS receiver_phone text,
  ADD COLUMN IF NOT EXISTS flight_no text,
  ADD COLUMN IF NOT EXISTS flight_at timestamp with time zone;