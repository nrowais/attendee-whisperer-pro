DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE command ILIKE '%trigger_flight_sync%';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.trigger_flight_sync();

DELETE FROM public.app_settings WHERE key IN ('flight_sync_token', 'aerodatabox_api_key', 'aviationstack_api_key');

DROP TABLE IF EXISTS public.flight_status_history;