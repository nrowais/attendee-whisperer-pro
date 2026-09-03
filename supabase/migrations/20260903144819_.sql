-- ربط تذاكر النقل بمواعيد الوصول والمغادرة لعرض رقم التذكرة في العد التنازلي
ALTER TABLE public.transport_trips
  ADD COLUMN IF NOT EXISTS arrival_id uuid REFERENCES public.speaker_arrivals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS departure_id uuid REFERENCES public.speaker_departures(id) ON DELETE SET NULL;

-- ربط التذاكر السابقة بناءً على المتحدث وموعد الرحلة
UPDATE public.transport_trips t
SET arrival_id = a.id
FROM public.speaker_arrivals a
WHERE t.trip_type = 'airport_pickup'
  AND t.speaker_id = a.speaker_id
  AND t.flight_at = a.arrival_time
  AND t.arrival_id IS NULL;

UPDATE public.transport_trips t
SET departure_id = d.id
FROM public.speaker_departures d
WHERE t.trip_type = 'airport_dropoff'
  AND t.speaker_id = d.speaker_id
  AND t.flight_at = d.departure_time
  AND t.departure_id IS NULL;
