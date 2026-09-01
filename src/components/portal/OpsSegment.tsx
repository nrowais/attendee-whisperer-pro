import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Phone, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpeakersBoard } from "@/components/portal/SpeakersStatusBoard";

export type OpsSegmentKey =
  | "today"
  | "incoming"
  | "airport"
  | "transport"
  | "hotel"
  | "departing";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدول",
  arrived: "وصل المطار",
  in_transport: "في النقل",
  at_hotel: "في الفندق",
  at_event: "في الفعالية",
  departed: "غادر",
  cancelled: "ملغي",
};

function isToday(value?: string | null) {
  if (!value) return false;
  const d = new Date(value);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function fmt(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-SA-u-ca-gregory", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const MATCHERS: Record<OpsSegmentKey, (r: any) => boolean> = {
  today: (r) =>
    isToday(r.arrival?.arrival_time) ||
    isToday(r.departure?.departure_time) ||
    isToday(r.trip?.scheduled_at) ||
    isToday(r.op?.arrival_actual_time) ||
    isToday(r.op?.departure_actual_time) ||
    (r.booking?.check_in ? isToday(r.booking.check_in) : false),
  incoming: (r) =>
    r.opStatus === "scheduled" && !!(r.arrival?.arrival_time || r.trip?.scheduled_at),
  airport: (r) => r.opStatus === "arrived",
  transport: (r) => r.opStatus === "in_transport",
  hotel: (r) => ["at_hotel", "at_event"].includes(r.opStatus),
  departing: (r) =>
    r.opStatus === "departed" || !!r.departure?.departure_time || r.trip?.direction === "departure",
};

export function OpsSegment({
  segment,
  title,
  subtitle,
}: {
  segment: OpsSegmentKey;
  title: string;
  subtitle: string;
}) {
  const { data, isLoading } = useSpeakersBoard();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const match = MATCHERS[segment];
    return (data ?? []).filter((r: any) => {
      if (!match(r)) return false;
      if (query.trim()) {
        const hay = `${r.full_name} ${r.organization ?? ""} ${r.country ?? ""} ${r.phone ?? ""}`;
        if (!hay.includes(query.trim())) return false;
      }
      return true;
    });
  }, [data, segment, query]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="relative min-w-52">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو الجهة..."
            className="pr-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          لا توجد سجلات في هذه المرحلة حالياً
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{rows.length} سجل</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((r: any) => (
              <Link
                key={r.id}
                to="/speakers/$speakerId"
                params={{ speakerId: r.id }}
                className="block space-y-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{r.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[r.title, r.organization, r.country].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Badge variant={r.opStatus === "cancelled" ? "destructive" : "secondary"}>
                    {STATUS_LABELS[r.opStatus] ?? r.opStatus}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>الوصول: {fmt(r.arrival?.arrival_time)} · المغادرة: {fmt(r.departure?.departure_time)}</p>
                  <p>
                    النقل: {r.trip ? `تذكرة #${r.trip.ticket_no ?? "—"} · ${fmt(r.trip.scheduled_at)}` : "—"}
                  </p>
                  <p>الفندق: {r.booking ? `${r.booking.hotelName} · ${r.booking.check_in ?? "—"}` : "—"}</p>
                  {r.phone ? (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span dir="ltr">{r.phone}</span>
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
