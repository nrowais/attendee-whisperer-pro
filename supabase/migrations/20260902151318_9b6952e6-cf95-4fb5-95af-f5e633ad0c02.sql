-- lovable-cron-fallback-reviewed: 144 runs/day; flight status/delay changes must surface within minutes and the flight data provider offers no webhooks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_flight_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  tok text;
BEGIN
  SELECT value INTO tok FROM public.app_settings WHERE key = 'flight_sync_token';
  IF tok IS NULL THEN RETURN; END IF;

  PERFORM net.http_post(
    url := 'https://project--b1bfc2f2-415c-4d62-b8ca-380bd6ed5b6b.lovable.app/api/public/flights-sync',
    headers := jsonb_build_object('content-type', 'application/json', 'x-sync-token', tok),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_flight_sync() FROM public, anon, authenticated;

SELECT cron.unschedule('shdc-flight-sync')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'shdc-flight-sync');

SELECT cron.schedule('shdc-flight-sync', '*/10 * * * *', 'SELECT public.trigger_flight_sync();');