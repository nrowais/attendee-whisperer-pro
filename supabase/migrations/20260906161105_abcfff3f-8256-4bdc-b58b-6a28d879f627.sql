ALTER TABLE public.dinner_guests ADD COLUMN IF NOT EXISTS sort_order integer;
WITH ordered AS (SELECT id, row_number() OVER (ORDER BY full_name) AS rn FROM public.dinner_guests)
UPDATE public.dinner_guests g SET sort_order = o.rn FROM ordered o WHERE g.id = o.id AND g.sort_order IS NULL;
ALTER TABLE public.dinner_guests ALTER COLUMN sort_order SET DEFAULT 0;