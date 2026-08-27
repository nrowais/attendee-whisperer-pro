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
    WHERE ur.role IN ('admin', 'coordinator', 'viewer');

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
    WHERE ur.role IN ('admin', 'coordinator', 'viewer');

    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END;
$$;

-- Backfill notifications for existing flight alerts to viewer users
INSERT INTO public.notifications (user_id, title, body, channel, is_read)
SELECT ur.user_id,
       CASE WHEN fa.alert_type = 'arrival' THEN 'تنبيه وصول رحلة' ELSE 'تنبيه إقلاع رحلة' END,
       fa.message,
       'portal',
       false
FROM public.flight_alerts fa
CROSS JOIN public.user_roles ur
WHERE ur.role = 'viewer'
  AND NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = ur.user_id AND n.title = (CASE WHEN fa.alert_type = 'arrival' THEN 'تنبيه وصول رحلة' ELSE 'تنبيه إقلاع رحلة' END) AND n.body = fa.message
  );