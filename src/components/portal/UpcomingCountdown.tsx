import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlarmClock, ChevronDown, ChevronUp, PlaneLanding, PlaneTakeoff, Ticket } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoles } from "@/hooks/useAuth";

const db = supabase as any;

type Kind = "arrival" | "departure";

type Item = {
  id: string;
  kind: Kind;
  name: string;
  detail: string;
  at: string;
  speakerId: string | null;
  eventId: string | null;
  point: string | null;
  terminal: string | null;
};

/** عدد العناصر الظاهرة قبل توسيع القائمة */
const COLLAPSED_COUNT = 5;

const kindMeta: Record<Kind, { label: string; icon: typeof PlaneLanding }> = {
  arrival: { label: "وصول رحلة", icon: PlaneLanding },
  departure: { label: "مغادرة رحلة", icon: PlaneTakeoff },
};

/** فترة التنبيه المسبق بالدقائق */
const ALERT_MINUTES = 120;

function formatRemaining(ms: number) {
  if (ms <= 0) return "حان الموعد";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d} يوم ${h} ساعة`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function UpcomingCountdown() {
  const [tick, setTick] = useState(() => Date.now());
  const [alerted, setAlerted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const query = useQuery({
    queryKey: ["upcoming-countdown"],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Item[]> => {
      const now = new Date();
      const nowIso = now.toISOString();
      const horizon = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();


      const [arrivals, departures] = await Promise.all([
        db
          .from("speaker_arrivals")
          .select("id, event_id, speaker_id, arrival_time, arrival_point, terminal, speakers(full_name)")
          .gte("arrival_time", nowIso)
          .lte("arrival_time", horizon)
          .order("arrival_time", { ascending: true })
          .limit(50),
        db
          .from("speaker_departures")
          .select("id, event_id, speaker_id, departure_time, departure_point, terminal, speakers(full_name)")
          .gte("departure_time", nowIso)
          .lte("departure_time", horizon)
          .order("departure_time", { ascending: true })
          .limit(50),
      ]);

      const items: Item[] = [];
      for (const a of arrivals.data ?? []) {
        items.push({
          id: `arrival-${a.id}`,
          kind: "arrival",
          name: a.speakers?.full_name ?? "—",
          detail: [a.arrival_point, a.terminal].filter(Boolean).join(" — ") || "المطار",
          at: a.arrival_time,
          speakerId: a.speaker_id ?? null,
          eventId: a.event_id ?? null,
          point: a.arrival_point ?? null,
          terminal: a.terminal ?? null,
        });
      }
      for (const d of departures.data ?? []) {
        items.push({
          id: `departure-${d.id}`,
          kind: "departure",
          name: d.speakers?.full_name ?? "—",
          detail: [d.departure_point, d.terminal].filter(Boolean).join(" — ") || "المطار",
          at: d.departure_time,
          speakerId: d.speaker_id ?? null,
          eventId: d.event_id ?? null,
          point: d.departure_point ?? null,
          terminal: d.terminal ?? null,
        });
      }

      return items
        .filter((i) => i.at && new Date(i.at).getTime() > Date.now() - 60_000)
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    },
  });

  const items = useMemo(() => query.data ?? [], [query.data]);
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, COLLAPSED_COUNT);
  const qc = useQueryClient();
  const { canEditOps } = useRoles();

  // إنشاء تذكرة نقل مباشرة من موعد الوصول/المغادرة (للمشرفين فقط)
  const createTicket = useMutation({
    mutationFn: async (item: Item) => {
      const isArrival = item.kind === "arrival";
      const { error } = await db.from("transport_trips").insert({
        event_id: item.eventId,
        speaker_id: item.speakerId,
        trip_type: isArrival ? "airport_pickup" : "airport_dropoff",
        pickup_location: isArrival ? (item.point ?? "المطار") : "الفندق",
        dropoff_location: isArrival ? "الفندق" : (item.point ?? "المطار"),
        scheduled_at: item.at,
        status: "scheduled",
        guest_name: item.name !== "—" ? item.name : null,
        terminal: item.terminal,
        flight_at: item.at,
      });
      if (error) throw error;
    },
    onSuccess: (_d, item) => {
      qc.invalidateQueries({ queryKey: ["transport-tickets"] });
      qc.invalidateQueries({ queryKey: ["fleet-trips"] });
      toast.success(`تم إنشاء تذكرة نقل لـ ${item.name}`);
    },
    onError: (e: any) => toast.error(e.message ?? "تعذر إنشاء التذكرة"),
  });

  useEffect(() => {
    for (const item of items) {
      const diff = new Date(item.at).getTime() - tick;
      if (diff > 0 && diff <= ALERT_MINUTES * 60 * 1000 && !alerted[item.id]) {
        setAlerted((prev) => ({ ...prev, [item.id]: true }));
        toast.warning(`${kindMeta[item.kind].label} خلال ${formatRemaining(diff)}`, {
          description: `${item.name} — ${item.detail}`,
        });
      }
    }
  }, [items, tick, alerted]);

  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">العد التنازلي للمواعيد</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            مواعيد الوصول والمغادرة من والى المطار فقط
          </p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <AlarmClock className="size-3.5" />
          مباشر
        </Badge>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          لا توجد مواعيد وصول أو مغادرة من المطار خلال الأيام الثلاثة القادمة
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const diff = new Date(item.at).getTime() - tick;
            const Icon = kindMeta[item.kind].icon;
            const urgent = diff <= ALERT_MINUTES * 60 * 1000;
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name} — {kindMeta[item.kind].label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.detail} • {new Date(item.at).toLocaleString("ar-SA-u-ca-gregory")}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={urgent ? "destructive" : "secondary"}
                  className="font-mono tabular-nums"
                >
                  <span dir={diff >= 86_400_000 ? "rtl" : "ltr"} className="inline-block whitespace-nowrap">
                    {formatRemaining(diff)}
                  </span>
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
