CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  person_name text;
  msg text;
  ttl text;
BEGIN
  IF TG_TABLE_NAME = 'guest_operations' THEN
    IF TG_OP = 'UPDATE' AND NEW.operational_status IS NOT DISTINCT FROM OLD.operational_status THEN
      RETURN NEW;
    END IF;
    SELECT s.full_name INTO person_name FROM public.speakers s WHERE s.id = NEW.speaker_id;
    ttl := 'تحديث الحالة التشغيلية';
    msg := COALESCE(person_name, 'ضيف') || ' — الحالة الآن: ' || COALESCE(NEW.operational_status, '—');
  ELSIF TG_TABLE_NAME = 'transport_trips' THEN
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;
    SELECT s.full_name INTO person_name FROM public.speakers s WHERE s.id = NEW.speaker_id;
    ttl := 'تحديث رحلة نقل';
    msg := 'رحلة نقل (' || COALESCE(NEW.trip_type, '') || ') لـ ' || COALESCE(person_name, 'ضيف') ||
           ' — الحالة: ' || COALESCE(NEW.status, '—');
  ELSE
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
      RETURN NEW;
    END IF;
    SELECT s.full_name INTO person_name FROM public.speakers s WHERE s.id = NEW.speaker_id;
    ttl := 'تحديث حجز فندق';
    msg := 'حجز فندقي لـ ' || COALESCE(person_name, 'ضيف') || ' — الحالة: ' || COALESCE(NEW.status, '—');
  END IF;

  INSERT INTO public.notifications (user_id, title, body, channel, is_read)
  SELECT ur.user_id, ttl, msg, 'portal', false
  FROM public.user_roles ur;

  INSERT INTO public.activity_logs (user_id, entity_type, entity_id, action, details)
  VALUES (auth.uid(), TG_TABLE_NAME, NEW.id, TG_OP, jsonb_build_object('message', msg));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_guest_ops_change ON public.guest_operations;
CREATE TRIGGER notify_guest_ops_change
AFTER INSERT OR UPDATE ON public.guest_operations
FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();

DROP TRIGGER IF EXISTS notify_transport_change ON public.transport_trips;
CREATE TRIGGER notify_transport_change
AFTER INSERT OR UPDATE ON public.transport_trips
FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();

DROP TRIGGER IF EXISTS notify_hotel_booking_change ON public.hotel_bookings;
CREATE TRIGGER notify_hotel_booking_change
AFTER INSERT OR UPDATE ON public.hotel_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_status_change();

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;