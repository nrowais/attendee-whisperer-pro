import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "التقويم — حوار الأمن والتاريخ" },
      { name: "description", content: "تقويم شهري يعرض الجلسات والوصول والمغادرة والنقل والإقامة للفعالية." },
      { property: "og:title", content: "التقويم — حوار الأمن والتاريخ" },
      { property: "og:description", content: "كل مواعيد الفعالية في تقويم واحد منظم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CalendarPage,
});

const db = supabase as any;

type Kind = "session" | "arrival" | "departure" | "trip";

type CalItem = {
  id: string;
  kind: Kind;
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  subtitle?: string;
  status?: string;
};

const kindMeta: Record<Kind, { label: string; className: string }> = {
  session: { label: "جلسة", className: "bg-primary/15 text-primary border-primary/30" },
  arrival: { label: "وصول", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  departure: { label: "مغادرة", className: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  trip: { label: "نقل", className: "bg-sky-500/15 text-sky-600 border-sky-500/30" },
};

const statusLabels: Record<string, string> = {
  scheduled: "مجدول",
  expected: "متوقع",
  arrived: "تم الوصول",
  landed: "هبطت الطائرة",
  received: "تم الاستلام",
  departed: "غادر",
  completed: "مكتمل",
  cancelled: "ملغي",
  in_progress: "جارٍ",
};

function statusLabel(status?: string) {
  if (!status) return undefined;
  return statusLabels[status] ?? status;
}

const weekDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function splitTs(ts: string | null) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return { date: ymd(d), time: d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) };
}

function useMonthItems(from: Date, to: Date) {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const fromDate = ymd(from);
  const toDate = ymd(to);

  return useQuery({
    queryKey: ["calendar", fromIso, toIso],
    refetchInterval: 60_000,
    queryFn: async (): Promise<CalItem[]> => {
      const [sessions, arrivals, departures, trips] = await Promise.all([
        db
          .from("speaker_sessions")
          .select("id, session_title, hall, starts_at, speakers(full_name)")
          .gte("starts_at", fromIso)
          .lte("starts_at", toIso),
        db
          .from("speaker_arrivals")
          .select("id, arrival_time, arrival_point, status, speakers(full_name)")
          .gte("arrival_time", fromIso)
          .lte("arrival_time", toIso),
        db
          .from("speaker_departures")
          .select("id, departure_time, departure_point, status, speakers(full_name)")
          .gte("departure_time", fromIso)
          .lte("departure_time", toIso),
        db
          .from("transport_trips")
          .select("id, scheduled_at, pickup_location, dropoff_location, status, speakers(full_name)")
          .gte("scheduled_at", fromIso)
          .lte("scheduled_at", toIso),
      ]);

      const items: CalItem[] = [];

      for (const s of sessions.data ?? []) {
        const t = splitTs(s.starts_at);
        if (t)
          items.push({
            id: `s-${s.id}`,
            kind: "session",
            date: t.date,
            time: t.time,
            title: s.session_title ?? "جلسة",
            subtitle: [s.speakers?.full_name, s.hall].filter(Boolean).join(" — "),
          });
      }
      for (const a of arrivals.data ?? []) {
        const t = splitTs(a.arrival_time);
        if (t)
          items.push({
            id: `a-${a.id}`,
            kind: "arrival",
            date: t.date,
            time: t.time,
            title: a.speakers?.full_name ?? "وصول متحدث",
            subtitle: a.arrival_point ?? undefined,
            status: a.status ?? undefined,
          });
      }
      for (const d of departures.data ?? []) {
        const t = splitTs(d.departure_time);
        if (t)
          items.push({
            id: `d-${d.id}`,
            kind: "departure",
            date: t.date,
            time: t.time,
            title: d.speakers?.full_name ?? "مغادرة متحدث",
            subtitle: d.departure_point ?? undefined,
            status: d.status ?? undefined,
          });
      }
      for (const tr of trips.data ?? []) {
        const t = splitTs(tr.scheduled_at);
        if (t)
          items.push({
            id: `t-${tr.id}`,
            kind: "trip",
            date: t.date,
            time: t.time,
            title: tr.speakers?.full_name ?? "رحلة نقل",
            subtitle: [tr.pickup_location, tr.dropoff_location].filter(Boolean).join(" ← "),
            status: tr.status ?? undefined,
          });
      }
      return items.sort((x, y) => (x.time ?? "").localeCompare(y.time ?? ""));
    },
  });
}

function CalendarPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(ymd(today));
  const [filter, setFilter] = useState<Kind | "all">("all");

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
  const { data, isLoading } = useMonthItems(monthStart, monthEnd);

  const byDate = useMemo(() => {
    const map = new Map<string, CalItem[]>();
    for (const item of data ?? []) {
      if (filter !== "all" && item.kind !== filter) continue;
      map.set(item.date, [...(map.get(item.date) ?? []), item]);
    }
    return map;
  }, [data, filter]);

  const cells = useMemo(() => {
    const lead = monthStart.getDay();
    const days = monthEnd.getDate();
    const arr: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= days; i++) arr.push(new Date(cursor.getFullYear(), cursor.getMonth(), i));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor, monthStart, monthEnd]);

  const monthLabel = cursor.toLocaleDateString("ar-SA-u-ca-gregory", { month: "long", year: "numeric" });
  const selectedItems = byDate.get(selected) ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">التقويم</h1>
            <p className="text-sm text-muted-foreground">الجلسات والوصول والمغادرة والنقل والإقامة</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-36 text-center font-semibold">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const n = new Date();
              setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
              setSelected(ymd(n));
            }}
          >
            اليوم
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          الكل
        </Button>
        {(Object.keys(kindMeta) as Kind[]).map((k) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
            {kindMeta[k].label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <div className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-semibold text-muted-foreground">
            {weekDays.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} className="min-h-24 rounded-lg bg-muted/30" />;
              const key = ymd(d);
              const items = byDate.get(key) ?? [];
              const isToday = key === ymd(today);
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={cn(
                    "min-h-24 rounded-lg border p-1.5 text-right transition hover:border-primary/50",
                    isSelected ? "border-primary ring-1 ring-primary/40" : "border-border",
                    isToday && "bg-primary/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold", isToday && "text-primary")}>{d.getDate()}</span>
                    {items.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 text-[10px] text-primary">{items.length}</span>
                    )}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {items.slice(0, 3).map((it) => (
                      <div
                        key={it.id}
                        className={cn("truncate rounded border px-1 py-0.5 text-[10px]", kindMeta[it.kind].className)}
                      >
                        {it.time ? `${it.time} ` : ""}
                        {it.title}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{items.length - 3} أخرى</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">
          تفاصيل يوم{" "}
          {new Date(selected).toLocaleDateString("ar-SA-u-ca-gregory", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </h2>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد مواعيد في هذا اليوم.</p>
        ) : (
          <ul className="space-y-2">
            {selectedItems.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.title}</p>
                  {it.subtitle && <p className="truncate text-sm text-muted-foreground">{it.subtitle}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {it.time && <span className="text-sm tabular-nums text-muted-foreground">{it.time}</span>}
                  <Badge variant="outline" className={kindMeta[it.kind].className}>
                    {kindMeta[it.kind].label}
                  </Badge>
                  {statusLabel(it.status) && (
                    <Badge
                      variant="outline"
                      className={cn(
                        it.status === "scheduled" || it.status === "expected"
                          ? "border-border text-muted-foreground"
                          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                      )}
                    >
                      {statusLabel(it.status)}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
