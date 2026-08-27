CREATE TABLE public.flight_alerts (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references public.flights(id) on delete cascade,
  alert_type text not null check (alert_type in ('arrival','departure')),
  due_at timestamp with time zone not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending','acknowledged','dismissed')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flight_alerts TO authenticated;
GRANT ALL ON public.flight_alerts TO service_role;

ALTER TABLE public.flight_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage flight alerts"
  ON public.flight_alerts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Coordinators can view flight alerts"
  ON public.flight_alerts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'));

CREATE POLICY "Coordinators can acknowledge flight alerts"
  ON public.flight_alerts
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') AND status = 'acknowledged');

CREATE POLICY "Viewers can view flight alerts"
  ON public.flight_alerts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.flight_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_flight_alerts(window_minutes integer default 60)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  created_count integer := 0;
  new_alert_id uuid;
  flight_record record;
  msg text;
BEGIN
  -- Arrival alerts
  FOR flight_record IN
    SELECT f.id, f.flight_number, f.airline, f.origin, f.destination, f.arrival_time
    FROM public.flights f
    WHERE f.arrival_time IS NOT NULL
      AND f.arrival_time BETWEEN now() AND now() + (window_minutes || ' minutes')::interval
      AND NOT EXISTS (
        SELECT 1 FROM public.flight_alerts fa
        WHERE fa.flight_id = f.id AND fa.alert_type = 'arrival'
      )
  LOOP
    msg := 'رحلة قادمة: ' || COALESCE(flight_record.airline, '') || ' ' || COALESCE(flight_record.flight_number, '') ||
           ' من ' || COALESCE(flight_record.origin, '') || ' إلى ' || COALESCE(flight_record.destination, '') ||
           ' — موعد الوصول ' || to_char(flight_record.arrival_time, 'HH24:MI');
    INSERT INTO public.flight_alerts (flight_id, alert_type, due_at, message)
    VALUES (flight_record.id, 'arrival', flight_record.arrival_time, msg)
    RETURNING id INTO new_alert_id;

    INSERT INTO public.notifications (user_id, title, body, channel, is_read)
    SELECT ur.user_id,
           'تنبيه وصول رحلة',
           msg,
           'portal',
           false
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'coordinator');

    created_count := created_count + 1;
  END LOOP;

  -- Departure alerts
  FOR flight_record IN
    SELECT f.id, f.flight_number, f.airline, f.origin, f.destination, f.departure_time
    FROM public.flights f
    WHERE f.departure_time IS NOT NULL
      AND f.departure_time BETWEEN now() AND now() + (window_minutes || ' minutes')::interval
      AND NOT EXISTS (
        SELECT 1 FROM public.flight_alerts fa
        WHERE fa.flight_id = f.id AND fa.alert_type = 'departure'
      )
  LOOP
    msg := 'رحلة مغادرة: ' || COALESCE(flight_record.airline, '') || ' ' || COALESCE(flight_record.flight_number, '') ||
           ' من ' || COALESCE(flight_record.origin, '') || ' إلى ' || COALESCE(flight_record.destination, '') ||
           ' — موعد الإقلاع ' || to_char(flight_record.departure_time, 'HH24:MI');
    INSERT INTO public.flight_alerts (flight_id, alert_type, due_at, message)
    VALUES (flight_record.id, 'departure', flight_record.departure_time, msg)
    RETURNING id INTO new_alert_id;

    INSERT INTO public.notifications (user_id, title, body, channel, is_read)
    SELECT ur.user_id,
           'تنبيه إقلاع رحلة',
           msg,
           'portal',
           false
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'coordinator');

    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_flight_alerts FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_flight_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_flight_alerts TO service_role;

SELECT cron.schedule('flight-alerts-checker', '*/15 * * * *', 'SELECT public.check_flight_alerts(60)');