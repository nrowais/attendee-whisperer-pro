import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlarmClock,
  BedDouble,
  CalendarClock,
  Car,
  Mic,
  PlaneLanding,
  PlaneTakeoff,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/countdown")({
  head: () => ({
    meta: [
      { title: "شاشة العدادات التنازلية — مؤتمر حوار الأمن والتاريخ" },
      { name: "description", content: "عدادات تنازلية حية لكل الجلسات والرحلات والنقل والمواعيد في وقت واحد." },
      { property: "og:title", content: "شاشة العدادات التنازلية — مؤتمر حوار الأمن والتاريخ" },
      { property: "og:description", content: "عدادات تنازلية حية لكل الجلسات والرحلات والنقل والمواعيد." },
    ],
  }),
  component: CountdownPage,
});

const db = supabase as any;

type Kind = "session" | "arrival" | "departure" | "transport" | "hotel";

type Item = {
  id: string;
  kind: Kind;
  title: string;
  detail: string;
  at: string;
  endAt?: string | null;
};

const kindMeta: Record<Kind, { label: string; icon: typeof Mic }> = {
  session: { label: "جلسة", icon: Mic },
  arrival: { label: "وصول رحلة", icon: PlaneLanding },
  departure: { label: "مغادرة رحلة", icon: PlaneTakeoff },
  transport: { label: "نقل", icon: Car },
  hotel: { label: "تسجيل إقامة", icon: BedDouble },
};

/** تنبيه فوري قبل الموعد بساعتين */
const ALERT_MINUTES = 120;

function fmtClock(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("ar-SA-u-ca-gregory", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCountdown(ms: number) {
  const total = Math.floor(Math.abs(ms) / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d} يوم و ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Status = "live" | "upcoming" | "done" | "past";

function statusOf(item: Item, now: number): Status {
  const start = new Date(item.at).getTime();
  const end = item.endAt ? new Date(item.endAt).getTime() : null;
  if (now >= start && end !== null && now <= end) return "live";
  if (end !== null && now > end) return "done";
  if (now >= start && end === null) return "past";
  return "upcoming";
}

function useCountdownItems() {
  return useQuery({
    queryKey: ["countdown-board"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Item[]> => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const endOfDay = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const horizon = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();
      const today = now.toISOString().slice(0, 10);
      const horizonDay = horizon.slice(0, 10);

      const [sessions, arrivals, departures, trips, bookings] = await Promise.all([
        db
          .from("speaker_sessions")
          .select("id, session_title, hall, starts_at, ends_at, speakers(full_name)")
          .gte("starts_at", start.toISOString())
          .lt("starts_at", endOfDay.toISOString())
          .order("starts_at", { ascending: true }),
        db
          .from("speaker_arrivals")
          .select("id, arrival_time, arrival_point, terminal, speakers(full_name)")
          .gte("arrival_time", start.toISOString())
          .lte("arrival_time", horizon)
          .order("arrival_time", { ascending: true }),
        db
          .from("speaker_departures")
          .select("id, departure_time, departure_point, terminal, speakers(full_name)")
          .gte("departure_time", start.toISOString())
          .lte("departure_time", horizon)
          .order("departure_time", { ascending: true }),
        db
          .from("transport_trips")
          .select("id, scheduled_at, trip_type, pickup_location, ticket_no, speakers(full_name)")
          .gte("scheduled_at", start.toISOString())
          .lte("scheduled_at", horizon)
          .order("scheduled_at", { ascending: true }),
        db
          .from("hotel_bookings")
          .select("id, check_in, speakers(full_name), hotels(name)")
          .gte("check_in", today)
          .lte("check_in", horizonDay)
          .order("check_in", { ascending: true }),
      ]);

      const items: Item[] = [];
      for (const s of sessions.data ?? []) {
        items.push({
          id: `session-${s.id}`,
          kind: "session",
          title: s.session_title ?? "جلسة",
          detail: [s.speakers?.full_name, s.hall].filter(Boolean).join(" — "),
          at: s.starts_at,
          endAt: s.ends_at,
        });
      }
      for (const a of arrivals.data ?? []) {
        items.push({
          id: `arrival-${a.id}`,
          kind: "arrival",
          title: a.speakers?.full_name ?? "ضيف",
          detail: [a.arrival_point, a.terminal].filter(Boolean).join(" — ") || "المطار",
          at: a.arrival_time,
        });
      }
      for (const d of departures.data ?? []) {
        items.push({
          id: `departure-${d.id}`,
          kind: "departure",
          title: d.speakers?.full_name ?? "ضيف",
          detail: [d.departure_point, d.terminal].filter(Boolean).join(" — ") || "المطار",
          at: d.departure_time,
        });
      }
      for (const t of trips.data ?? []) {
        items.push({
          id: `transport-${t.id}`,
          kind: "transport",
          title: t.speakers?.full_name ?? "ضيف",
          detail: [t.trip_type, t.pickup_location, t.ticket_no ? `تذكرة ${t.ticket_no}` : null]
            .filter(Boolean)
            .join(" — "),
          at: t.scheduled_at,
        });
      }
      for (const b of bookings.data ?? []) {
        items.push({
          id: `hotel-${b.id}`,
          kind: "hotel",
          title: b.speakers?.full_name ?? "ضيف",
          detail: b.hotels?.name ?? "الفندق",
          at: `${b.check_in}T14:00:00`,
        });
      }
      return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    },
  });
}

function CountdownPage() {
  const { data, isLoading } = useCountdownItems();
  const [now, setNow] = useState(() => Date.now());
  const alertedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(() => data ?? [], [data]);

  // تنبيهات فورية: قبل الموعد بساعتين، وعند بدء الجلسة/الموعد
  useEffect(() => {
    for (const item of items) {
      const start = new Date(item.at).getTime();
      const diff = start - now;
      const meta = kindMeta[item.kind];

      const soonKey = `${item.id}-soon`;
      if (diff > 0 && diff <= ALERT_MINUTES * 60 * 1000 && !alertedRef.current[soonKey]) {
        alertedRef.current[soonKey] = true;
        toast.warning(`${meta.label} خلال ${fmtCountdown(diff)}`, {
          description: `${item.title} — ${item.detail}`,
        });
      }

      const startKey = `${item.id}-start`;
      if (diff <= 0 && diff > -120_000 && !alertedRef.current[startKey]) {
        alertedRef.current[startKey] = true;
        toast.info(`حان الآن موعد: ${meta.label}`, {
          description: `${item.title} — ${item.detail}`,
        });
      }

      if (item.endAt) {
        const endDiff = new Date(item.endAt).getTime() - now;
        const endKey = `${item.id}-end`;
        if (endDiff <= 0 && endDiff > -120_000 && !alertedRef.current[endKey]) {
          alertedRef.current[endKey] = true;
          toast.success(`انتهت ${meta.label}: ${item.title}`);
        }
      }
    }
  }, [items, now]);

  const live = items.filter((i) => statusOf(i, now) === "live");
  const upcoming = items.filter((i) => statusOf(i, now) === "upcoming");
  const finished = items.filter((i) => statusOf(i, now) === "done" || statusOf(i, now) === "past");

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">شاشة العدادات التنازلية</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              كل الجلسات والرحلات والنقل والمواعيد في شاشة واحدة — تنبيه فوري قبل الموعد بـ {ALERT_MINUTES / 60} ساعة وعند البدء
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-2">
              <AlarmClock className="size-3.5" />
              مباشر — {new Date(now).toLocaleTimeString("ar-SA-u-ca-gregory")}
            </Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="font-display text-2xl font-bold text-primary">{live.length}</p>
            <p className="text-xs text-muted-foreground">جارية الآن</p>
          </div>
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="font-display text-2xl font-bold text-foreground">{upcoming.length}</p>
            <p className="text-xs text-muted-foreground">قادمة</p>
          </div>
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="font-display text-2xl font-bold text-muted-foreground">{finished.length}</p>
            <p className="text-xs text-muted-foreground">انتهت</p>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <section className="surface-card p-10 text-center text-sm text-muted-foreground">
          لا توجد مواعيد اليوم أو خلال الأيام القادمة
        </section>
      ) : (
        <section className="surface-card p-6">
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const meta = kindMeta[item.kind];
              const Icon = meta.icon;
              const status = statusOf(item, now);
              const start = new Date(item.at).getTime();
              const end = item.endAt ? new Date(item.endAt).getTime() : null;
              const urgent = status === "upcoming" && start - now <= ALERT_MINUTES * 60 * 1000;

              return (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                        status === "live"
                          ? "bg-primary text-primary-foreground"
                          : urgent
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-foreground"
                      }`}
                    >
                      <Icon className="size-4.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.title}
                        <span className="text-muted-foreground"> — {meta.label}</span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.detail || "—"} • الساعة {fmtClock(item.at)}
                        {item.endAt ? ` إلى ${fmtClock(item.endAt)}` : ""}
                      </p>
                    </div>
                  </div>

                  {status === "live" ? (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className="gap-1.5">
                        <span className="size-1.5 animate-pulse rounded-full bg-current" />
                        جارية الآن
                      </Badge>
                      {end !== null && (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
                          تتبقى {fmtCountdown(end - now)}
                        </span>
                      )}
                    </div>
                  ) : status === "done" ? (
                    <Badge variant="secondary" className="shrink-0">
                      انتهت
                    </Badge>
                  ) : status === "past" ? (
                    <Badge variant="secondary" className="shrink-0">
                      حان موعدها
                    </Badge>
                  ) : (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={urgent ? "destructive" : "outline"} className="gap-1.5">
                        <CalendarClock className="size-3" />
                        قادمة
                      </Badge>
                      <span
                        className={`font-mono text-xs tabular-nums ${urgent ? "text-destructive" : "text-primary"}`}
                        dir="ltr"
                      >
                        {fmtCountdown(start - now)}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
