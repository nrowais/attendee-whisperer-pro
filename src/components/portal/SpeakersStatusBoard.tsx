import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CalendarClock,
  PlaneLanding,
  Car,
  BedDouble,
  Flag,
  Search,
  Mic,
  XCircle,
  Phone,
  Plus,
  Clock,
  IdCard,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useRoles } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DriverCardDialog } from "@/components/portal/DriverCardDialog";

const db = supabase as any;

type StatusKey = "all" | "scheduled" | "arrived" | "present" | "departed" | "cancelled";

const STATUS_TABS: { value: StatusKey; label: string; match: (s: string) => boolean }[] = [
  { value: "all", label: "الكل", match: () => true },
  { value: "scheduled", label: "مجدول", match: (s) => s === "scheduled" },
  { value: "arrived", label: "وصل", match: (s) => s === "arrived" },
  {
    value: "present",
    label: "موجود",
    match: (s) => ["in_transport", "at_hotel", "at_event"].includes(s),
  },
  { value: "departed", label: "غادر", match: (s) => s === "departed" },
  { value: "cancelled", label: "ملغي", match: (s) => s === "cancelled" },
];

const DETAIL_STATUS_LABELS: Record<string, string> = {
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
  checked_in: "تم تسجيل الدخول",
  checked_out: "تم تسجيل الخروج",
  cancelled: "ملغاة",
};

function useSpeakersBoard() {
  return useQuery({
    queryKey: ["speakers-status-board"],
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
        { data: flights },
        { data: cards },
      ] =
        await Promise.all([
          db.from("speakers").select("id, full_name, title, organization, country, phone").order("full_name"),
          db.from("guest_operations").select("*"),
          db
            .from("transport_trips")
            .select(
              "id, ticket_no, speaker_id, driver_id, vehicle_id, trip_type, status, scheduled_at, actual_pickup_at, actual_dropoff_at, pickup_location, dropoff_location",
            )
            .order("scheduled_at", { ascending: false }),
          db.from("hotel_bookings").select("id, speaker_id, hotel_id, check_in, check_out, status"),
          db.from("hotels").select("id, name"),
          db.from("drivers").select("id, full_name, phone"),
          db.from("vehicles").select("id, plate_number"),
          db.from("speaker_arrivals").select("speaker_id, arrival_time, flight_id, terminal"),
          db.from("flights").select("id, arrival_time, flight_number, airline"),
          db
            .from("driver_cards")
            .select("speaker_id, guest_name, card_no, ticket_no")
            .order("created_at", { ascending: false }),
        ]);

      const hotelNames = new Map((hotels ?? []).map((h: any) => [h.id, h.name]));
      const driverMap = new Map((drivers ?? []).map((d: any) => [d.id, d]));
      const vehicleMap = new Map((vehicles ?? []).map((v: any) => [v.id, v]));
      const opsBySpeaker = new Map((ops ?? []).map((o: any) => [o.speaker_id, o]));
      const flightById = new Map((flights ?? []).map((f: any) => [f.id, f]));
      const arrivalTimeBySpeaker = new Map<string, string>();
      const arrivalInfoBySpeaker = new Map<string, any>();
      (arrivals ?? []).forEach((a: any) => {
        const flight = a.flight_id ? flightById.get(a.flight_id) : null;
        const t = a.arrival_time ?? flight?.arrival_time;
        const current = arrivalTimeBySpeaker.get(a.speaker_id);
        if (t && (!current || t < current)) {
          arrivalTimeBySpeaker.set(a.speaker_id, t);
          arrivalInfoBySpeaker.set(a.speaker_id, {
            terminal: a.terminal ?? "",
            flightNo: flight?.flight_number ?? "",
            airline: flight?.airline ?? "",
          });
        }
      });
      const tripBySpeaker = new Map<string, any>();
      (trips ?? []).forEach((t: any) => {
        if (t.speaker_id && !tripBySpeaker.has(t.speaker_id)) tripBySpeaker.set(t.speaker_id, t);
      });
      const bookingBySpeaker = new Map<string, any>();
      (bookings ?? []).forEach((b: any) => {
        if (b.speaker_id && !bookingBySpeaker.has(b.speaker_id)) bookingBySpeaker.set(b.speaker_id, b);
      });
      const cardBySpeakerId = new Map<string, any>();
      const cardByGuestName = new Map<string, any>();
      (cards ?? []).forEach((c: any) => {
        if (c.speaker_id && !cardBySpeakerId.has(c.speaker_id)) cardBySpeakerId.set(c.speaker_id, c);
        if (c.guest_name && !cardByGuestName.has(c.guest_name)) cardByGuestName.set(c.guest_name, c);
      });

      const rows = (speakers ?? []).map((s: any) => {
        const op: any = opsBySpeaker.get(s.id);
        const rawTrip = tripBySpeaker.get(s.id);
        const trip = rawTrip
          ? {
              ...rawTrip,
              direction:
                rawTrip.trip_type === "airport_pickup"
                  ? "arrival"
                  : rawTrip.trip_type === "airport_dropoff"
                    ? "departure"
                    : "internal",
              driver: driverMap.get(rawTrip.driver_id) ?? null,
              vehicle: vehicleMap.get(rawTrip.vehicle_id) ?? null,
            }
          : null;
        const booking = bookingBySpeaker.get(s.id);
        return {
          ...s,
          opStatus: (op?.operational_status as string) ?? "scheduled",
          arrivalAt: arrivalTimeBySpeaker.get(s.id) ?? null,
          arrivalInfo: arrivalInfoBySpeaker.get(s.id) ?? null,
          op,
          trip,
          booking: booking
            ? { ...booking, hotelName: hotelNames.get(booking.hotel_id) ?? "—" }
            : null,
          card: cardBySpeakerId.get(s.id) ?? cardByGuestName.get(s.full_name) ?? null,
        };
      });

      rows.sort((a: any, b: any) => {
        if (a.arrivalAt && b.arrivalAt) return new Date(a.arrivalAt).getTime() - new Date(b.arrivalAt).getTime();
        if (a.arrivalAt) return -1;
        if (b.arrivalAt) return 1;
        return a.full_name.localeCompare(b.full_name, "ar");
      });

      return rows;
    },
  });
}

export function SpeakersStatusBoard() {
  const { data, isLoading } = useSpeakersBoard();
  const { canEdit } = useRoles();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusKey>("all");
  const [tripFilter, setTripFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [hotelFilter, setHotelFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const addSpeaker = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const payload: Record<string, string | null> = {};
      for (const key of ["full_name", "title", "organization", "country", "email", "phone"]) {
        payload[key] = values[key]?.trim() ? values[key].trim() : null;
      }
      const { data: inserted, error } = await db
        .from("speakers")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      // إنشاء حالة تشغيلية مستقلة للمتحدث الجديد
      await db.from("guest_operations").insert({ speaker_id: inserted.id, operational_status: "scheduled" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["speakers-status-board"] });
      queryClient.invalidateQueries({ queryKey: ["crud", "speakers"] });
      toast.success("تمت إضافة المتحدث بنجاح");
      setAddOpen(false);
      setForm({});
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر الحفظ"),
  });

  const rows = useMemo(() => {
    const tab = STATUS_TABS.find((t) => t.value === status) ?? STATUS_TABS[0]!;
    return (data ?? []).filter((r: any) => {
      if (!tab.match(r.opStatus)) return false;
      if (directionFilter !== "all" && r.trip?.direction !== directionFilter) return false;
      if (tripFilter === "has" && !r.trip) return false;
      if (tripFilter === "none" && r.trip) return false;
      if (!["all", "has", "none"].includes(tripFilter) && r.trip?.status !== tripFilter) return false;
      if (hotelFilter === "has" && !r.booking) return false;
      if (hotelFilter === "none" && r.booking) return false;
      if (!["all", "has", "none"].includes(hotelFilter) && r.booking?.status !== hotelFilter)
        return false;
      if (query.trim()) {
        const q = query.trim();
        const hay = `${r.full_name} ${r.organization ?? ""} ${r.country ?? ""} ${r.phone ?? ""}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, status, tripFilter, directionFilter, hotelFilter, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: (data ?? []).length };
    STATUS_TABS.slice(1).forEach((t) => {
      map[t.value] = (data ?? []).filter((r: any) => t.match(r.opStatus)).length;
    });
    return map;
  }, [data]);

  const statusIcons: Record<StatusKey, typeof CalendarClock> = {
    all: Mic,
    scheduled: CalendarClock,
    arrived: PlaneLanding,
    present: Flag,
    departed: XCircle,
    cancelled: XCircle,
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Status tabs */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {STATUS_TABS.map((t) => {
          const Icon = statusIcons[t.value] ?? Mic;
          const active = status === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatus(t.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold">{t.label}</span>
              <span className="text-lg font-bold">{counts[t.value] ?? 0}</span>
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
        {canEdit ? (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة متحدث
          </Button>
        ) : null}
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="all">وصول ومغادرة</option>
          <option value="arrival">رحلات الوصول</option>
          <option value="departure">رحلات المغادرة</option>
          <option value="internal">تنقلات داخلية</option>
        </select>
        <select
          value={tripFilter}
          onChange={(e) => setTripFilter(e.target.value)}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="all">كل النقل</option>
          <option value="has">له رحلة نقل</option>
          <option value="none">بدون نقل</option>
          <option value="scheduled">نقل مجدول</option>
          <option value="in_progress">نقل جارٍ</option>
          <option value="completed">نقل مكتمل</option>
          <option value="cancelled">نقل ملغي</option>
        </select>
        <select
          value={hotelFilter}
          onChange={(e) => setHotelFilter(e.target.value)}
          className="h-10 rounded-md border border-border bg-card px-3 text-sm"
        >
          <option value="all">كل الإقامة</option>
          <option value="has">له حجز</option>
          <option value="none">بدون حجز</option>
          <option value="reserved">حجز محجوز</option>
          <option value="checked_in">سجّل دخول الفندق</option>
          <option value="checked_out">غادر الفندق</option>
          <option value="cancelled">حجز ملغي</option>
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          لا توجد نتائج مطابقة للفلاتر الحالية
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{rows.length} متحدث — مرتب حسب وقت الوصول</p>
          <div className="grid grid-cols-1 gap-3">
            {rows.map((r: any, index: number) => (
              <div key={r.id} className="relative space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                  {index + 1}
                </div>
                <div className="flex items-start justify-between gap-2 pr-4">
                  <div className="min-w-0">
                    <DriverCardDialog
                      trip={
                        r.trip ?? {
                          speaker: { full_name: r.full_name, organization: r.organization },
                          guest_name: r.full_name,
                          flight_at: r.arrivalAt,
                          scheduled_at: r.arrivalAt,
                          pickup_location: "",
                          dropoff_location: "",
                          terminal: "",
                          receiver_name: "",
                          receiver_phone: "",
                          flight_no: "",
                        }
                      }
                      trigger={
                        <button
                          type="button"
                          className="group flex items-center gap-1 truncate text-right font-semibold text-foreground hover:text-primary hover:underline"
                          title="إصدار بطاقة للسائق"
                        >
                          <IdCard className="h-3.5 w-3.5 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                          {r.full_name}
                        </button>
                      }
                    />
                    <p className="truncate text-xs text-muted-foreground">
                      {[r.title, r.organization, r.country].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Badge variant={r.opStatus === "cancelled" ? "destructive" : "secondary"}>
                    {DETAIL_STATUS_LABELS[r.opStatus] ?? r.opStatus}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  {r.arrivalAt ? (
                    <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-primary">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        وقت الوصول: {" "}
                        {new Date(r.arrivalAt).toLocaleString("ar-SA-u-ca-gregory", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                    <Car className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {r.trip ? (
                      <span className="min-w-0 truncate">
                        <Link to="/tickets" className="font-mono text-primary underline-offset-4 hover:underline">
                          تذكرة #{r.trip.ticket_no ?? "—"}
                        </Link>{" "}
                        · {r.trip.pickup_location ?? "—"} ← {r.trip.dropoff_location ?? "—"} ·{" "}
                        <Badge variant="outline" className="text-[10px]">
                          {TRIP_STATUS_LABELS[r.trip.status] ?? r.trip.status}
                        </Badge>
                        <br />
                        <Link to="/fleet" className="text-primary underline-offset-4 hover:underline">
                          {r.trip.driver?.full_name ?? "بدون سائق"}
                          {r.trip.vehicle?.plate_number ? ` · ${r.trip.vehicle.plate_number}` : ""}
                        </Link>
                        <br />
                        <span className="text-[10px] text-muted-foreground">
                          مجدول: {r.trip.scheduled_at ? new Date(r.trip.scheduled_at).toLocaleString("ar-SA-u-ca-gregory", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          {" · "}فعلي: {r.trip.actual_pickup_at ? new Date(r.trip.actual_pickup_at).toLocaleString("ar-SA-u-ca-gregory", { hour: "2-digit", minute: "2-digit" }) : "—"}
                          {" → "}{r.trip.actual_dropoff_at ? new Date(r.trip.actual_dropoff_at).toLocaleString("ar-SA-u-ca-gregory", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </span>
                      </span>
                     ) : r.card ? (
                       <span className="min-w-0 truncate">
                         بطاقة سائق #{r.card.card_no}
                         {r.card.ticket_no ? ` · تذكرة #${r.card.ticket_no}` : ""}
                         <br />
                         <span className="text-[10px] text-muted-foreground">لا توجد رحلة نقل مرتبطة بعد</span>
                       </span>
                     ) : (
                       <span className="text-muted-foreground">لا توجد رحلة نقل مرتبطة بعد</span>
                     )}
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                    <BedDouble className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {r.booking ? (
                      <span className="min-w-0 truncate">
                        {r.booking.hotelName} · {r.booking.check_in ?? "—"} →{" "}
                        {r.booking.check_out ?? "—"} ·{" "}
                        <Badge variant="outline" className="text-[10px]">
                          {BOOKING_STATUS_LABELS[r.booking.status] ?? r.booking.status}
                        </Badge>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">لا يوجد حجز إقامة</span>
                    )}
                  </div>
                  {r.phone ? (
                    <div className="flex items-center gap-2 px-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span dir="ltr">{r.phone}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-start font-display">إضافة متحدث جديد</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { key: "full_name", label: "الاسم الكامل", required: true },
                { key: "title", label: "المسمى الوظيفي" },
                { key: "organization", label: "الجهة" },
                { key: "country", label: "الدولة" },
                { key: "email", label: "البريد الإلكتروني" },
                { key: "phone", label: "رقم الجوال" },
              ] as { key: string; label: string; required?: boolean }[]
            ).map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`add-${f.key}`}>
                  {f.label}
                  {f.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                <Input
                  id={`add-${f.key}`}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              onClick={() => {
                if (!form['full_name']?.trim()) {
                  toast.error("الحقل المطلوب: الاسم الكامل");
                  return;
                }
                addSpeaker.mutate(form);
              }}
              disabled={addSpeaker.isPending}
            >
              حفظ
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
