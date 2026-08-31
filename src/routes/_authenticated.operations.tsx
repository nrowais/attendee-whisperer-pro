import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PlaneLanding,
  PlaneTakeoff,
  Car,
  BedDouble,
  LogOut,
  Flag,
  Search,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/operations")({
  head: () => ({
    meta: [
      { title: "إدارة الحالة التشغيلية — حوار الأمن والتاريخ" },
      {
        name: "description",
        content:
          "تسجيل وصول ومغادرة المتحدثين ودخول الفندق ومغادرته وحالة النقل لحظياً وانعكاسها في لوحة الحالات.",
      },
      { property: "og:title", content: "إدارة الحالة التشغيلية" },
      {
        property: "og:description",
        content: "تسجيل فوري لحركة كل متحدث: الوصول، النقل، الفندق، المغادرة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OperationsPage,
});

const db = supabase as any;

const STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدول",
  arrived: "وصل المطار",
  in_transport: "في النقل",
  at_hotel: "في الفندق",
  at_event: "في الفعالية",
  departed: "غادر",
  cancelled: "ملغي",
};

const TRIP_STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدولة",
  in_progress: "جارية",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

const BOOKING_STATUS_LABELS: Record<string, string> = {
  reserved: "محجوزة",
  checked_in: "سجّل دخول",
  checked_out: "سجّل خروج",
  cancelled: "ملغاة",
};

type ActionKey =
  | "arrived"
  | "airport_received"
  | "in_transport"
  | "at_hotel"
  | "hotel_checkin"
  | "hotel_checkout"
  | "at_event"
  | "departed";

const ACTIONS: {
  key: ActionKey;
  label: string;
  icon: typeof PlaneLanding;
  status?: string;
  field?: string;
  trip?: string;
  booking?: string;
}[] = [
  { key: "arrived", label: "وصل المطار", icon: PlaneLanding, status: "arrived", field: "arrival_actual_time" },
  { key: "airport_received", label: "تم الاستقبال", icon: Flag, field: "airport_received_at" },
  {
    key: "in_transport",
    label: "بدأ النقل",
    icon: Car,
    status: "in_transport",
    field: "transport_departed_at",
    trip: "in_progress",
  },
  {
    key: "at_hotel",
    label: "وصل الفندق",
    icon: BedDouble,
    status: "at_hotel",
    field: "hotel_arrived_at",
    trip: "completed",
  },
  {
    key: "hotel_checkin",
    label: "دخول الفندق",
    icon: BedDouble,
    status: "at_hotel",
    field: "hotel_checkin_at",
    booking: "checked_in",
  },
  { key: "hotel_checkout", label: "مغادرة الفندق", icon: LogOut, booking: "checked_out" },
  { key: "at_event", label: "في الفعالية", icon: Flag, status: "at_event", field: "event_arrived_at" },
  {
    key: "departed",
    label: "غادر",
    icon: PlaneTakeoff,
    status: "departed",
    field: "departure_actual_time",
    booking: "checked_out",
  },
];

function useOperationsData() {
  return useQuery({
    queryKey: ["operations-manage"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [{ data: speakers }, { data: ops }, { data: trips }, { data: bookings }, { data: hotels }] =
        await Promise.all([
          db.from("speakers").select("id, full_name, title, organization, country").order("full_name"),
          db.from("guest_operations").select("*"),
          db
            .from("transport_trips")
            .select("id, speaker_id, trip_type, status, scheduled_at, pickup_location, dropoff_location")
            .order("scheduled_at", { ascending: false }),
          db.from("hotel_bookings").select("id, speaker_id, hotel_id, check_in, check_out, status"),
          db.from("hotels").select("id, name"),
        ]);

      const hotelNames = new Map((hotels ?? []).map((h: any) => [h.id, h.name]));
      const opsBy = new Map((ops ?? []).map((o: any) => [o.speaker_id, o]));
      const tripBy = new Map<string, any>();
      (trips ?? []).forEach((t: any) => {
        if (t.speaker_id && !tripBy.has(t.speaker_id)) tripBy.set(t.speaker_id, t);
      });
      const bookingBy = new Map<string, any>();
      (bookings ?? []).forEach((b: any) => {
        if (b.speaker_id && !bookingBy.has(b.speaker_id)) bookingBy.set(b.speaker_id, b);
      });

      return (speakers ?? []).map((s: any) => {
        const op: any = opsBy.get(s.id);
        const booking = bookingBy.get(s.id);
        return {
          ...s,
          op: op ?? null,
          opStatus: (op?.operational_status as string) ?? "scheduled",
          trip: tripBy.get(s.id) ?? null,
          booking: booking ? { ...booking, hotelName: hotelNames.get(booking.hotel_id) ?? "—" } : null,
        };
      });
    },
  });
}

function timeLabel(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("ar-SA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OperationsPage() {
  const { canEdit } = useRoles();
  const { data, isLoading } = useOperationsData();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pending, setPending] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ row, action }: { row: any; action: (typeof ACTIONS)[number] }) => {
      const now = new Date().toISOString();

      if (action.status || action.field) {
        const payload: Record<string, any> = { speaker_id: row.id };
        if (action.status) payload['operational_status'] = action.status;
        if (action.field) payload[action.field] = now;
        if (row.op?.id) {
          const { error } = await db.from("guest_operations").update(payload).eq("id", row.op.id);
          if (error) throw error;
        } else {
          const { error } = await db
            .from("guest_operations")
            .insert({ operational_status: action.status ?? "scheduled", ...payload });
          if (error) throw error;
        }
      }

      if (action.trip && row.trip?.id) {
        const { error } = await db
          .from("transport_trips")
          .update({ status: action.trip })
          .eq("id", row.trip.id);
        if (error) throw error;
      }

      if (action.booking && row.booking?.id) {
        const { error } = await db
          .from("hotel_bookings")
          .update({ status: action.booking })
          .eq("id", row.booking.id);
        if (error) throw error;
      }
    },
    onMutate: ({ row, action }) => setPending(`${row.id}:${action.key}`),
    onSettled: () => setPending(null),
    onSuccess: (_d, { row, action }) => {
      toast.success(`${row.full_name}: ${action.label}`);
      queryClient.invalidateQueries({ queryKey: ["operations-manage"] });
      queryClient.invalidateQueries({ queryKey: ["speakers-status-board"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر حفظ التحديث"),
  });

  const rows = useMemo(() => {
    return (data ?? []).filter((r: any) => {
      if (statusFilter !== "all" && r.opStatus !== statusFilter) return false;
      if (query.trim()) {
        const hay = `${r.full_name} ${r.organization ?? ""} ${r.country ?? ""}`;
        if (!hay.includes(query.trim())) return false;
      }
      return true;
    });
  }, [data, statusFilter, query]);

  return (
    <div className="space-y-5" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">إدارة الحالة التشغيلية</h1>
        <p className="text-sm text-muted-foreground">
          سجّل وصول المتحدث ومغادرته ودخوله الفندق وخروجه وحالة النقل — وتظهر فوراً في لوحة الحالات.
        </p>
      </header>

      {!canEdit && (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          حسابك للاطلاع فقط، لا يمكنك تسجيل التحديثات.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو الجهة..."
            className="pr-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{rows.length} متحدث</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          لا توجد نتائج
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r: any) => (
            <div key={r.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{r.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[r.title, r.organization, r.country].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={r.opStatus === "cancelled" ? "destructive" : "secondary"}>
                    {STATUS_LABELS[r.opStatus] ?? r.opStatus}
                  </Badge>
                  {r.trip && (
                    <Badge variant="outline" className="gap-1">
                      <Car className="h-3 w-3" />
                      {TRIP_STATUS_LABELS[r.trip.status] ?? r.trip.status}
                    </Badge>
                  )}
                  {r.booking && (
                    <Badge variant="outline" className="gap-1">
                      <BedDouble className="h-3 w-3" />
                      {BOOKING_STATUS_LABELS[r.booking.status] ?? r.booking.status}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ACTIONS.map((a) => {
                  const Icon = a.icon;
                  const key = `${r.id}:${a.key}`;
                  const busy = pending === key;
                  const done =
                    (a.field && r.op?.[a.field]) ||
                    (a.key === "hotel_checkout" && r.booking?.status === "checked_out");
                  return (
                    <Button
                      key={a.key}
                      size="sm"
                      variant={done ? "secondary" : "outline"}
                      disabled={!canEdit || busy}
                      onClick={() => mutation.mutate({ row: r, action: a })}
                      className={cn("gap-1.5 text-xs", done && "text-primary")}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                      {a.label}
                    </Button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {ACTIONS.filter((a) => a.field && r.op?.[a.field!]).map((a) => (
                  <span key={a.key}>
                    {a.label}: {timeLabel(r.op[a.field!])}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
