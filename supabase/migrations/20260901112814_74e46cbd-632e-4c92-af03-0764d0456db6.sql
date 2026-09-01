ALTER TABLE public.driver_cards ADD COLUMN IF NOT EXISTS hotel_map_url TEXT;

COMMENT ON COLUMN public.driver_cards.hotel_map_url IS 'Direct Google Maps link for the hotel location';

GRANT SELECT, INSERT, UPDATE ON public.driver_cards TO authenticated;
