import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Mic, Users, Plane, BedDouble, Car, ClipboardList, UserCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — بوابة إدارة الفعاليات" },
      { name: "description", content: "ملخص شامل للفعاليات والمتحدثين والدعوات والحضور والسفر." },
      { property: "og:title", content: "لوحة التحكم — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "ملخص شامل لجميع عمليات الفعالية." },
    ],
  }),
  component: Dashboard,
});

const db = supabase as any;

const cards = [
  { table: "events", label: "الفعاليات", icon: CalendarDays },
  { table: "speakers", label: "المتحدثون", icon: Mic },
  { table: "invitees", label: "المدعوون", icon: Users },
  { table: "attendance", label: "تسجيلات الحضور", icon: UserCheck },
  { table: "flights", label: "الرحلات الجوية", icon: Plane },
  { table: "hotel_bookings", label: "حجوزات الفنادق", icon: BedDouble },
  { table: "transport_trips", label: "رحلات النقل", icon: Car },
  { table: "speaker_requests", label: "طلبات المتحدثين", icon: ClipboardList },
];

function Dashboard() {
  const counts = useQuery({
    queryKey: ["dashboard-counts"],
    queryFn: async () => {
      const entries = await Promise.all(
        cards.map(async (card) => {
          const { count } = await db.from(card.table).select("*", { count: "exact", head: true });
          return [card.table, count ?? 0] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, number>;
    },
  });

  const upcoming = useQuery({
    queryKey: ["upcoming-events"],
    queryFn: async () => {
      const { data } = await db
        .from("events")
        .select("id, name, city, venue, start_date, status")
        .order("start_date", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نظرة سريعة على حالة الفعاليات والعمليات التشغيلية.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.table} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{card.label}</span>
              <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                <card.icon className="size-4" />
              </span>
            </div>
            {counts.isLoading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-3 font-display text-3xl font-bold text-foreground">
                {counts.data?.[card.table] ?? 0}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold text-foreground">أقرب الفعاليات</h2>
        <div className="mt-4 divide-y divide-border">
          {upcoming.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (upcoming.data ?? []).length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">لا توجد فعاليات مسجّلة بعد.</p>
          ) : (
            (upcoming.data ?? []).map((event: any) => (
              <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-foreground">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[event.city, event.venue].filter(Boolean).join(" — ") || "بدون موقع"}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {event.start_date
                    ? new Date(event.start_date).toLocaleDateString("ar-SA-u-ca-gregory")
                    : "بدون تاريخ"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
