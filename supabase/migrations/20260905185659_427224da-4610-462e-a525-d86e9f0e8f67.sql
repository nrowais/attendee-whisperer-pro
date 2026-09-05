create table public.seat_colors (
  id uuid primary key default gen_random_uuid(),
  area text not null,
  seat_row text not null,
  seat_number text not null,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (area, seat_row, seat_number)
);

GRANT SELECT ON public.seat_colors TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seat_colors TO authenticated;
GRANT ALL ON public.seat_colors TO service_role;

alter table public.seat_colors enable row level security;

create policy "Everyone can read seat colors"
on public.seat_colors for select to authenticated using (true);

create policy "Admins manage seat colors"
on public.seat_colors for all to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger set_updated_at before update on public.seat_colors
for each row execute function public.update_updated_at_column();