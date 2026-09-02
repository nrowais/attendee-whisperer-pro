DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'speakers','invitees','invitations','attendance','events','speaker_sessions',
    'speaker_arrivals','speaker_departures','flights','flight_alerts',
    'hotels','hotel_rooms','hotel_bookings','drivers','vehicles','transport_trips',
    'driver_cards','guest_operations','speaker_requests','request_categories',
    'staff','staff_assignments','activity_logs','profiles','user_roles'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;