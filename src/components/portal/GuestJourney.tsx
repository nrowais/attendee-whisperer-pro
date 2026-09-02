import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Car,
  BedDouble,
  Flag,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  Pencil,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const db = supabase as any;

const fmt = (v?: string | null, withDate = true) =>
  v
    ? new Date(v).toLocaleString("ar-SA-u-ca-gregory", {
        ...(withDate ? { month: "short", day: "numeric" } : {}),
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

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

const OP_STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدول",
  arrived: "وصل المطار",
  in_transport: "في النقل",
  at_hotel: "في الفندق",
  at_event: "في الفعالية",
  departed: "غادر",
  cancelled: "ملغي",
};

const OP_TIME_FIELDS: { key: string; label: string }[] = [
  { key: "arrival_actual_time", label: "وقت الوصول الفعلي للمطار" },
  { key: "airport_received_at", label: "وقت الاستقبال في المطار" },
  { key: "transport_departed_at", label: "وقت بدء النقل" },
  { key: "hotel_arrived_at", label: "وقت الوصول للفندق" },
  { key: "hotel_checkin_at", label: "وقت دخول الفندق" },
  { key: "event_arrived_at", label: "وقت الوصول للفعالية" },
  { key: "departure_actual_time", label: "وقت المغادرة الفعلي" },
];

const toLocalInput = (v?: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const STAGES = [
  { key: "flight_in", label: "الطيران", icon: PlaneLanding, link: "/movements" },
  { key: "airport", label: "المطار", icon: Flag, link: "/operations" },
  { key: "transport", label: "النقل", icon: Car, link: "/tickets" },
  { key: "hotel", label: "الفندق", icon: BedDouble, link: "/hotels" },
  { key: "event", label: "الفعالية", icon: Flag, link: "/dashboard" },
  { key: "flight_out", label: "المغادرة", icon: PlaneTakeoff, link: "/movements" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

function useJourneys() {
  return useQuery({
    queryKey: ["guest-journey"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [
        { data: speakers },
        { data: ops },
        { data: trips },
        { data: bookings },
        { data: hotels },
        { data: drivers },
        { data: vehicles },
        { data: arrivals },
        { data: departures },
        { data: flights },
        { data: sessions },
      ] = await Promise.all([
        db
          .from("speakers")
          .select("id, full_name, title, organization, country, phone")
          .order("full_name"),
        db.from("guest_operations").select("*"),
        db
          .from("transport_trips")
          .select(
            "id, ticket_no, speaker_id, driver_id, vehicle_id, trip_type, status, scheduled_at, actual_pickup_at, actual_dropoff_at, pickup_location, dropoff_location",
          )
          .order("scheduled_at", { ascending: true }),
        db
          .from("hotel_bookings")
          .select("id, speaker_id, hotel_id, room_id, check_in, check_out, status"),
        db.from("hotels").select("id, name, city"),
        db.from("drivers").select("id, full_name, phone"),
        db.from("vehicles").select("id, plate_number"),
        db.from("speaker_arrivals").select("*"),
        db.from("speaker_departures").select("*"),
        db.from("flights").select("*"),
        db
          .from("speaker_sessions")
          .select("id, speaker_id, session_title, hall, starts_at")
          .order("starts_at", { ascending: true }),
      ]);

      const hotelMap = new Map<string, any>((hotels ?? []).map((h: any) => [h.id, h]));
      const driverMap = new Map((drivers ?? []).map((d: any) => [d.id, d]));
      const vehicleMap = new Map((vehicles ?? []).map((v: any) => [v.id, v]));
      const flightMap = new Map((flights ?? []).map((f: any) => [f.id, f]));
      const opsBy = new Map((ops ?? []).map((o: any) => [o.speaker_id, o]));
      const arrBy = new Map((arrivals ?? []).map((a: any) => [a.speaker_id, a]));
      const depBy = new Map((departures ?? []).map((d: any) => [d.speaker_id, d]));

      const tripsBy = new Map<string, any[]>();
      (trips ?? []).forEach((t: any) => {
        if (!t.speaker_id) return;
        const list = tripsBy.get(t.speaker_id) ?? [];
        list.push({
          ...t,
          driver: driverMap.get(t.driver_id) ?? null,
          vehicle: vehicleMap.get(t.vehicle_id) ?? null,
        });
        tripsBy.set(t.speaker_id, list);
      });
      const bookingBy = new Map<string, any>();
      (bookings ?? []).forEach((b: any) => {
        if (b.speaker_id && !bookingBy.has(b.speaker_id)) bookingBy.set(b.speaker_id, b);
      });
      const sessionBy = new Map<string, any>();
      (sessions ?? []).forEach((s: any) => {
        if (s.speaker_id && !sessionBy.has(s.speaker_id)) sessionBy.set(s.speaker_id, s);
      });

      return (speakers ?? []).map((s: any) => {
        const op: any = opsBy.get(s.id) ?? null;
        const arrival: any = arrBy.get(s.id) ?? null;
        const departure: any = depBy.get(s.id) ?? null;
        const booking: any = bookingBy.get(s.id) ?? null;
        const speakerTrips = tripsBy.get(s.id) ?? [];
        const inbound =
          speakerTrips.find((t: any) => t.trip_type === "airport_pickup") ?? speakerTrips[0] ?? null;
        const outbound = speakerTrips.find((t: any) => t.trip_type === "airport_dropoff") ?? null;
        const hotel = booking ? hotelMap.get(booking.hotel_id) : null;

        const stages: Record<StageKey, { done: boolean; time: string | null; detail: string }> = {
          flight_in: {
            done: Boolean(op?.arrival_actual_time),
            time: op?.arrival_actual_time ?? arrival?.arrival_time ?? null,
            detail: (() => {
              const f: any = arrival?.flight_id ? flightMap.get(arrival.flight_id) : null;
              return f
                ? `${f.airline ?? ""} ${f.flight_number ?? ""} · ${f.origin ?? "—"} ← ${f.destination ?? "—"}`.trim()
                : arrival?.arrival_point
                  ? `${arrival.arrival_point}${arrival.terminal ? ` · صالة ${arrival.terminal}` : ""}`
                  : "لا توجد بيانات رحلة قادمة";
            })(),
          },
          airport: {
            done: Boolean(op?.airport_received_at),
            time: op?.airport_received_at ?? null,
            detail: op?.airport_received_at
              ? "تم الاستقبال في المطار"
              : arrival?.arrival_point
                ? `نقطة الاستقبال: ${arrival.arrival_point}`
                : "بانتظار الاستقبال",
          },
          transport: {
            done: Boolean(op?.transport_departed_at || inbound?.actual_pickup_at),
            time: op?.transport_departed_at ?? inbound?.actual_pickup_at ?? inbound?.scheduled_at ?? null,
            detail: inbound
              ? `تذكرة #${inbound.ticket_no ?? "—"} · ${inbound.pickup_location ?? "—"} ← ${inbound.dropoff_location ?? "—"} · ${
                  inbound.driver?.full_name ?? "بدون سائق"
                }${inbound.vehicle?.plate_number ? ` · ${inbound.vehicle.plate_number}` : ""} · ${
                  TRIP_STATUS_LABELS[inbound.status] ?? inbound.status
                }`
              : "لا توجد رحلة نقل مرتبطة",
          },
          hotel: {
            done: Boolean(op?.hotel_checkin_at || booking?.status === "checked_in"),
            time: op?.hotel_checkin_at ?? op?.hotel_arrived_at ?? null,
            detail: booking
              ? `${hotel?.name ?? "فندق"} · ${booking.check_in ?? "—"} → ${booking.check_out ?? "—"} · ${
                  BOOKING_STATUS_LABELS[booking.status] ?? booking.status
                }`
              : "لا يوجد حجز إقامة",
          },
          event: {
            done: Boolean(op?.event_arrived_at),
            time: op?.event_arrived_at ?? null,
            detail: (() => {
              const ses = sessionBy.get(s.id);
              return ses
                ? `${ses.session_title}${ses.hall ? ` · ${ses.hall}` : ""}${
                    ses.starts_at ? ` · ${fmt(ses.starts_at)}` : ""
                  }`
                : "لا توجد جلسة مسجلة";
            })(),
          },
          flight_out: {
            done: Boolean(op?.departure_actual_time),
            time: op?.departure_actual_time ?? departure?.departure_time ?? null,
            detail: (() => {
              const f: any = departure?.flight_id ? flightMap.get(departure.flight_id) : null;
              const base = f
                ? `${f.airline ?? ""} ${f.flight_number ?? ""} · ${f.origin ?? "—"} → ${f.destination ?? "—"}`.trim()
                : departure?.departure_point
                  ? departure.departure_point
                  : "لا توجد بيانات رحلة مغادرة";
              return outbound
                ? `${base} · نقل المغادرة: تذكرة #${outbound.ticket_no ?? "—"} (${
                    TRIP_STATUS_LABELS[outbound.status] ?? outbound.status
                  })`
                : base;
            })(),
          },
        };

        const doneCount = STAGES.filter((st) => stages[st.key].done).length;
        const currentStage =
          STAGES.slice().reverse().find((st) => stages[st.key].done)?.key ?? null;

        return {
          ...s,
          op,
          opStatus: (op?.operational_status as string) ?? "scheduled",
          stages,
          doneCount,
          currentStage,
          progress: Math.round((doneCount / STAGES.length) * 100),
        };
      });
    },
  });
}

type EditForm = {
  operational_status: string;
  notes: string;
  times: Record<string, string>;
};

export function GuestJourney() {
  const { data, isLoading } = useJourneys();
  const { isAdmin } = useRoles();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      operational_status: r.op?.operational_status ?? "scheduled",
      notes: r.op?.notes ?? "",
      times: Object.fromEntries(
        OP_TIME_FIELDS.map((f) => [f.key, toLocalInput(r.op?.[f.key])]),
      ),
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing || !form) return;
      const payload: Record<string, any> = {
        speaker_id: editing.id,
        operational_status: form.operational_status,
        notes: form.notes || null,
      };
      OP_TIME_FIELDS.forEach((f) => {
        const v = form.times[f.key] ?? "";
        payload[f.key] = v ? new Date(v).toISOString() : null;
      });
      if (editing.op?.id) {
        const { error } = await db.from("guest_operations").update(payload).eq("id", editing.op.id);
        if (error) throw error;
      } else {
        const { error } = await db.from("guest_operations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`تم حفظ رحلة الضيف: ${editing?.full_name}`);
      setEditing(null);
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["guest-journey"] });
      queryClient.invalidateQueries({ queryKey: ["operations-manage"] });
      queryClient.invalidateQueries({ queryKey: ["speakers-status-board"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر حفظ التعديل"),
  });

  const rows = useMemo(() => {
    return (data ?? []).filter((r: any) => {
      if (stageFilter === "not_started" && r.doneCount > 0) return false;
      if (stageFilter === "in_progress" && (r.doneCount === 0 || r.doneCount === STAGES.length))
        return false;
      if (stageFilter === "completed" && r.doneCount !== STAGES.length) return false;
      if (
        !["all", "not_started", "in_progress", "completed"].includes(stageFilter) &&
        r.currentStage !== stageFilter
      )
        return false;
      if (query.trim()) {
        const hay = `${r.full_name} ${r.organization ?? ""} ${r.country ?? ""} ${r.phone ?? ""}`;
        if (!hay.includes(query.trim())) return false;
      }
      return true;
    });
  }, [data, query, stageFilter]);

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    STAGES.forEach((st) => {
      map[st.key] = (data ?? []).filter((r: any) => r.currentStage === st.key).length;
    });
    return map;
  }, [data]);

  return (
    <div className="space-y-5" dir="rtl">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Plane className="h-5 w-5 text-primary" />
          تتبّع رحلة الضيف
        </h1>
        <p className="text-sm text-muted-foreground">
          خط زمني موحّد يربط المطار والنقل والفندق والفعالية والمغادرة لكل ضيف.
        </p>
      </header>

      {/* Stage pipeline */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((st) => {
          const Icon = st.icon;
          const active = stageFilter === st.key;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => setStageFilter(active ? "all" : st.key)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold">{st.label}</span>
              <span className="text-lg font-bold">{stageCounts[st.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالاسم أو الجهة أو الدولة..."
            className="pr-9"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="all">كل الحالات</option>
          <option value="not_started">لم تبدأ الرحلة</option>
          <option value="in_progress">قيد التنفيذ</option>
          <option value="completed">مكتملة</option>
          {STAGES.map((st) => (
            <option key={st.key} value={st.key}>
              عند مرحلة: {st.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          لا توجد نتائج مطابقة
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{rows.length} ضيف/متحدث</p>
          <div className="space-y-3">
            {rows.map((r: any) => (
              <article key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{r.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[r.title, r.organization, r.country].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="mt-1 inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-primary transition-colors hover:bg-primary/10"
                        title="تعديل رحلة الضيف"
                      >
                        <Pencil className="h-3 w-3" />
                        تعديل الرحلة
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{r.doneCount}/{STAGES.length} مراحل</Badge>
                    <Link
                      to="/operations"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      تحديث الحالة
                    </Link>
                  </div>
                </div>

                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${r.progress}%` }}
                  />
                </div>

                <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {STAGES.map((st) => {
                    const stage = r.stages[st.key];
                    const Icon = st.icon;
                    return (
                      <li
                        key={st.key}
                        className={cn(
                          "rounded-lg border p-3",
                          stage.done ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {stage.done ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <Link
                            to={st.link}
                            className="text-xs font-semibold text-foreground underline-offset-4 hover:underline"
                          >
                            {st.label}
                          </Link>
                          {stage.time ? (
                            <span className="ms-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {fmt(stage.time)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                          {stage.detail}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </article>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent dir="rtl" className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل رحلة الضيف</DialogTitle>
            <DialogDescription>
              {editing?.full_name} — عدّل الحالة التشغيلية والأوقات المسجلة لكل مرحلة.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">الحالة التشغيلية</label>
                <select
                  value={form.operational_status}
                  onChange={(e) => setForm({ ...form, operational_status: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                >
                  {Object.entries(OP_STATUS_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {OP_TIME_FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">{f.label}</label>
                    <Input
                      type="datetime-local"
                      dir="ltr"
                      value={form.times[f.key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          times: { ...form.times, [f.key]: e.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">ملاحظات</label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="ملاحظات تشغيلية (اختياري)"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-1.5"
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
