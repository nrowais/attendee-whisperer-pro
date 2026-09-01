CREATE SEQUENCE IF NOT EXISTS public.driver_card_no_seq START 1001;

CREATE TABLE IF NOT EXISTS public.driver_cards (
  id uuid primary key default gen_random_uuid(),
  card_no integer not null default nextval('public.driver_card_no_seq'),
  speaker_id uuid references public.speakers(id) on delete set null,
  trip_id uuid references public.transport_trips(id) on delete set null,
  guest_name text,
  terminal text,
  receiver_name text,
  receiver_phone text,
  flight_at timestamptz,
  flight_no text,
  driver_name text,
  vehicle text,
  pickup_location text,
  dropoff_location text,
  ticket_no text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER SEQUENCE public.driver_card_no_seq OWNED BY public.driver_cards.card_no;
CREATE UNIQUE INDEX IF NOT EXISTS driver_cards_card_no_key ON public.driver_cards(card_no);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_cards TO authenticated;
GRANT ALL ON public.driver_cards TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.driver_card_no_seq TO authenticated, service_role;

ALTER TABLE public.driver_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read driver cards" ON public.driver_cards FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff write driver cards" ON public.driver_cards FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordinator'));
CREATE POLICY "staff update driver cards" ON public.driver_cards FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'coordinator'));
CREATE POLICY "admin delete driver cards" ON public.driver_cards FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER driver_cards_updated_at BEFORE UPDATE ON public.driver_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();