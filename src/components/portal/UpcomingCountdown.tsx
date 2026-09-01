import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlarmClock, PlaneLanding, PlaneTakeoff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const db = supabase as any;

type Kind = "arrival" | "departure";

type Item = {
  id: string;
  kind: Kind;
  name: string;
  detail: string;
  at: string;
};

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
          .select("id, arrival_time, arrival_point, terminal, speakers(full_name)")
          .gte("arrival_time", nowIso)
          .lte("arrival_time", horizon)
          .order("arrival_time", { ascending: true })
          .limit(20),
        db
          .from("speaker_departures")
          .select("id, departure_time, departure_point, terminal, speakers(full_name)")
          .gte("departure_time", nowIso)
          .lte("departure_time", horizon)
          .order("departure_time", { ascending: true })
          .limit(20),
      ]);

      const items: Item[] = [];
      for (const a of arrivals.data ?? []) {
        items.push({
          id: `arrival-${a.id}`,
          kind: "arrival",
          name: a.speakers?.full_name ?? "—",
          detail: [a.arrival_point, a.terminal].filter(Boolean).join(" — ") || "المطار",
          at: a.arrival_time,
        });
      }
      for (const d of departures.data ?? []) {
        items.push({
          id: `departure-${d.id}`,
          kind: "departure",
          name: d.speakers?.full_name ?? "—",
          detail: [d.departure_point, d.terminal].filter(Boolean).join(" — ") || "المطار",
          at: d.departure_time,
        });
      }

      return items
        .filter((i) => i.at && new Date(i.at).getTime() > Date.now() - 60_000)
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
        .slice(0, 12);
    },
  });

  const items = useMemo(() => query.data ?? [], [query.data]);

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
                  dir="ltr"
                >
                  {formatRemaining(diff)}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
