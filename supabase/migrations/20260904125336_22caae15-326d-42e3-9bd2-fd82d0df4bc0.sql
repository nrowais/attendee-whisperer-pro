ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS seat_row text,
  ADD COLUMN IF NOT EXISTS seat_number text,
  ADD COLUMN IF NOT EXISTS seat_area text;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_unique_seat
  ON public.invitations (event_id, seat_area, seat_row, seat_number)
  WHERE seat_row IS NOT NULL AND seat_number IS NOT NULL;