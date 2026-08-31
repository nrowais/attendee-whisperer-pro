import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Car, BedDouble, Plus, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/daily")({
  head: () => ({
    meta: [
      { title: "الإدخال اليومي — حوار الأمن والتاريخ" },
      {
        name: "description",
        content: "إدخال رحلات النقل وحجوزات الفندق ليوم محدد وانعكاسها في التقويم والملخص اليومي.",
      },
      { property: "og:title", content: "الإدخال اليومي — حوار الأمن والتاريخ" },
      { property: "og:description", content: "تسجيل حركات النقل والإقامة يوماً بيوم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyEntryPage,
});

const db = supabase as any;

const NONE = "__none__";

const tripTypes = [
  { value: "airport_pickup", label: "استقبال من المطار" },
  { value: "airport_dropoff", label: "توصيل للمطار" },
  { value: "hotel_venue", label: "الفندق ↔ المقر" },
  { value: "other", label: "أخرى" },
];

const tripStatuses = [
  { value: "scheduled", label: "مجدولة" },
  { value: "in_progress", label: "جارية" },
  { value: "completed", label: "مكتملة" },
  { value: "cancelled", label: "ملغاة" },
];

const bookingStatuses = [
  { value: "reserved", label: "محجوزة" },
  { value: "checked_in", label: "تم تسجيل الدخول" },
  { value: "checked_out", label: "تم تسجيل الخروج" },
  { value: "cancelled", label: "ملغاة" },
];

function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function labelOf(list: { value: string; label: string }[], value: string | null) {
  return list.find((i) => i.value === value)?.label ?? "—";
}

function DailyEntryPage() {
  const queryClient = useQueryClient();
  const { canEdit } = useRoles();
  const [date, setDate] = useState(todayIso());

  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const lookups = useQuery({
    queryKey: ["daily-lookups"],
    queryFn: async () => {
      const [events, speakers, drivers, vehicles, hotels, rooms] = await Promise.all([
        db.from("events").select("id, name").order("created_at", { ascending: false }),
        db.from("speakers").select("id, full_name").order("full_name"),
        db.from("drivers").select("id, full_name").order("full_name"),
        db.from("vehicles").select("id, plate_number").order("plate_number"),
        db.from("hotels").select("id, name").order("name"),
        db.from("hotel_rooms").select("id, room_number, hotel_id").order("room_number"),
      ]);
      return {
        events: (events.data ?? []) as any[],
        speakers: (speakers.data ?? []) as any[],
        drivers: (drivers.data ?? []) as any[],
        vehicles: (vehicles.data ?? []) as any[],
        hotels: (hotels.data ?? []) as any[],
        rooms: (rooms.data ?? []) as any[],
      };
    },
  });

  const dayData = useQuery({
    queryKey: ["daily-entry", date],
    queryFn: async () => {
      const [trips, bookings] = await Promise.all([
        db
          .from("transport_trips")
          .select("*")
          .gte("scheduled_at", dayStart)
          .lte("scheduled_at", dayEnd)
          .order("scheduled_at"),
        db
          .from("hotel_bookings")
          .select("*")
          .lte("check_in", date)
          .or(`check_out.gte.${date},check_out.is.null`)
          .order("check_in"),
      ]);
      return {
        trips: (trips.data ?? []) as any[],
        bookings: (bookings.data ?? []) as any[],
      };
    },
  });

  const eventId = lookups.data?.events?.[0]?.id ?? null;
  const nameOf = (list: any[] | undefined, id: string | null, key: string) =>
    (list ?? []).find((r) => r.id === id)?.[key] ?? "—";

  type TripForm = {
    speaker_id?: string;
    driver_id?: string;
    vehicle_id?: string;
    pickup_location?: string;
    dropoff_location?: string;
    trip_type: string;
    status: string;
    time: string;
  };
  type BookingForm = {
    speaker_id?: string;
    hotel_id?: string;
    room_id?: string;
    check_out?: string;
    notes?: string;
    status: string;
  };

  const [trip, setTrip] = useState<TripForm>({
    trip_type: "airport_pickup",
    status: "scheduled",
    time: "08:00",
  });
  const [booking, setBooking] = useState<BookingForm>({ status: "reserved" });

  const roomsForHotel = useMemo(
    () =>
      (lookups.data?.rooms ?? []).filter(
        (r) => !booking["hotel_id"] || r.hotel_id === booking.hotel_id,
      ),
    [lookups.data?.rooms, booking.hotel_id],
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["daily-entry"] });
    queryClient.invalidateQueries({ queryKey: ["calendar"] });
    queryClient.invalidateQueries({ queryKey: ["live-stats"] });
    queryClient.invalidateQueries({ queryKey: ["crud"] });
  };

  const addTrip = useMutation({
    mutationFn: async () => {
      const payload = {
        event_id: eventId,
        speaker_id: trip.speaker_id || null,
        driver_id: trip.driver_id || null,
        vehicle_id: trip.vehicle_id || null,
        trip_type: trip.trip_type || "other",
        pickup_location: trip.pickup_location || null,
        dropoff_location: trip.dropoff_location || null,
        scheduled_at: new Date(`${date}T${trip.time || "08:00"}:00`).toISOString(),
        status: trip.status || "scheduled",
      };
      const { error } = await db.from("transport_trips").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت إضافة رحلة النقل");
      setTrip({ trip_type: "airport_pickup", status: "scheduled", time: "08:00" });
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message ?? "تعذّر الحفظ"),
  });

  const addBooking = useMutation({
    mutationFn: async () => {
      const payload = {
        event_id: eventId,
        speaker_id: booking.speaker_id || null,
        hotel_id: booking.hotel_id || null,
        room_id: booking.room_id || null,
        check_in: date,
        check_out: booking.check_out || addDays(date, 1),
        status: booking.status || "reserved",
        notes: booking.notes || null,
      };
      const { error } = await db.from("hotel_bookings").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت إضافة حجز الإقامة");
      setBooking({ status: "reserved" });
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message ?? "تعذّر الحفظ"),
  });

  const removeRow = useMutation({
    mutationFn: async ({ table, id }: { table: string; id: string }) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم الحذف");
      invalidateAll();
    },
    onError: (e: any) => toast.error(e.message ?? "تعذّر الحذف"),
  });

  const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString("ar-SA-u-ca-gregory", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">الإدخال اليومي</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سجّل رحلات النقل وحجوزات الإقامة ليوم محدد — تنعكس مباشرة في التقويم والملخص اليومي.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="mb-1 block text-xs">اليوم</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayIso())}
              className="w-44"
            />
          </div>
          <Button variant="outline" onClick={() => setDate(todayIso())}>
            <CalendarDays className="ms-1 size-4" />
            اليوم
          </Button>
        </div>
      </div>

      <p className="rounded-xl border border-border bg-secondary/40 px-4 py-2 text-sm font-medium text-foreground">
        {dayLabel}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Transport */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Car className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-card-foreground">رحلات النقل</h2>
              <p className="text-xs text-muted-foreground">حركات النقل الأرضي لهذا اليوم</p>
            </div>
          </div>

          {canEdit ? (
            <div className="mb-5 grid gap-3 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs">المتحدث</Label>
                <Select
                  value={trip.speaker_id ?? NONE}
                  onValueChange={(v) =>
                    setTrip((p) => ({ ...p, speaker_id: v === NONE ? "" : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون</SelectItem>
                    {(lookups.data?.speakers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">نوع الرحلة</Label>
                <Select
                  value={trip.trip_type}
                  onValueChange={(v) => setTrip((p) => ({ ...p, trip_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tripTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">من</Label>
                <Input
                  value={trip.pickup_location ?? ""}
                  onChange={(e) => setTrip((p) => ({ ...p, pickup_location: e.target.value }))}
                  placeholder="نقطة الانطلاق"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">إلى</Label>
                <Input
                  value={trip.dropoff_location ?? ""}
                  onChange={(e) => setTrip((p) => ({ ...p, dropoff_location: e.target.value }))}
                  placeholder="الوجهة"
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">الوقت</Label>
                <Input
                  type="time"
                  value={trip.time ?? "08:00"}
                  onChange={(e) => setTrip((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">السائق</Label>
                <Select
                  value={trip.driver_id ?? NONE}
                  onValueChange={(v) => setTrip((p) => ({ ...p, driver_id: v === NONE ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون</SelectItem>
                    {(lookups.data?.drivers ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">المركبة</Label>
                <Select
                  value={trip.vehicle_id ?? NONE}
                  onValueChange={(v) => setTrip((p) => ({ ...p, vehicle_id: v === NONE ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون</SelectItem>
                    {(lookups.data?.vehicles ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.plate_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">الحالة</Label>
                <Select
                  value={trip.status}
                  onValueChange={(v) => setTrip((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {tripStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Button
                  className="w-full"
                  onClick={() => addTrip.mutate()}
                  disabled={addTrip.isPending}
                >
                  <Plus className="ms-1 size-4" />
                  إضافة رحلة نقل
                </Button>
              </div>
            </div>
          ) : null}

          {dayData.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : dayData.data?.trips.length ? (
            <ul className="space-y-2">
              {dayData.data.trips.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-card-foreground">
                      {labelOf(tripTypes, t.trip_type)} ·{" "}
                      {nameOf(lookups.data?.speakers, t.speaker_id, "full_name")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.pickup_location ?? "—"} ← {t.dropoff_location ?? "—"} ·{" "}
                      {t.scheduled_at
                        ? new Date(t.scheduled_at).toLocaleTimeString("ar-SA-u-ca-gregory", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{labelOf(tripStatuses, t.status)}</Badge>
                    {canEdit ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          removeRow.mutate({ table: "transport_trips", id: t.id })
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              لا توجد رحلات نقل في هذا اليوم
            </p>
          )}
        </section>

        {/* Hotel */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BedDouble className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-card-foreground">
                حجوزات الإقامة
              </h2>
              <p className="text-xs text-muted-foreground">الإقامات السارية في هذا اليوم</p>
            </div>
          </div>

          {canEdit ? (
            <div className="mb-5 grid gap-3 rounded-xl border border-border bg-secondary/30 p-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1 block text-xs">المتحدث / الضيف</Label>
                <Select
                  value={booking.speaker_id ?? NONE}
                  onValueChange={(v) =>
                    setBooking((p) => ({ ...p, speaker_id: v === NONE ? "" : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون</SelectItem>
                    {(lookups.data?.speakers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">الفندق</Label>
                <Select
                  value={booking.hotel_id ?? NONE}
                  onValueChange={(v) =>
                    setBooking((p) => ({ ...p, hotel_id: v === NONE ? "" : v, room_id: "" }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون</SelectItem>
                    {(lookups.data?.hotels ?? []).map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">الغرفة</Label>
                <Select
                  value={booking.room_id ?? NONE}
                  onValueChange={(v) =>
                    setBooking((p) => ({ ...p, room_id: v === NONE ? "" : v }))
                  }
                >
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>بدون</SelectItem>
                    {roomsForHotel.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">تاريخ الخروج</Label>
                <Input
                  type="date"
                  value={booking.check_out ?? addDays(date, 1)}
                  onChange={(e) => setBooking((p) => ({ ...p, check_out: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1 block text-xs">الحالة</Label>
                <Select
                  value={booking.status}
                  onValueChange={(v) => setBooking((p) => ({ ...p, status: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {bookingStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block text-xs">ملاحظات</Label>
                <Input
                  value={booking.notes ?? ""}
                  onChange={(e) => setBooking((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="اختياري"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  className="w-full"
                  onClick={() => addBooking.mutate()}
                  disabled={addBooking.isPending}
                >
                  <Plus className="ms-1 size-4" />
                  إضافة حجز إقامة (دخول {date})
                </Button>
              </div>
            </div>
          ) : null}

          {dayData.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : dayData.data?.bookings.length ? (
            <ul className="space-y-2">
              {dayData.data.bookings.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-card-foreground">
                      {nameOf(lookups.data?.speakers, b.speaker_id, "full_name")} ·{" "}
                      {nameOf(lookups.data?.hotels, b.hotel_id, "name")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      غرفة {nameOf(lookups.data?.rooms, b.room_id, "room_number")} · دخول{" "}
                      {b.check_in ?? "—"} · خروج {b.check_out ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{labelOf(bookingStatuses, b.status)}</Badge>
                    {canEdit ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow.mutate({ table: "hotel_bookings", id: b.id })}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              لا توجد إقامات في هذا اليوم
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
