import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlarmClock, ChevronDown, ChevronUp, PlaneLanding, PlaneTakeoff, Ticket } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/hooks/useAuth";
import { buildDriverCardHtml, HOTELS, type DriverCardData } from "@/components/portal/DriverCardDialog";

/** فتح نافذة طباعة بطاقة السائق — نفس قالب شاشة التذاكر */
function openCardPdf(card: DriverCardData, ticketNo: number | string) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    toast.error("يرجى السماح بالنوافذ المنبثقة لتحميل البطاقة");
    return;
  }
  const html = buildDriverCardHtml(card).replace(
    "<title>بطاقة توجيه السائق</title>",
    `<title>بطاقة-سائق-${String(ticketNo)}</title>`,
  );
  win.document.open();
  win.document.write(html);
  win.document.close();
}

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
  sourceId: string;
  ticketNos: number[];
  /** تاريخ آخر تذكرة مصدرة لهذا الموعد */
  lastTicketAt: string | null;
};

/** حد الإصدار: بطاقة واحدة فقط لكل اسم خلال الساعة */
const TICKET_COOLDOWN_MS = 60 * 60 * 1000;

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

function splitDateTime(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
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

      const arrivalIds = (arrivals.data ?? []).map((a: any) => a.id);
      const departureIds = (departures.data ?? []).map((d: any) => d.id);

      const [arrivalTickets, departureTickets] = await Promise.all([
        arrivalIds.length
          ? db
              .from("transport_trips")
              .select("id, arrival_id, ticket_no, created_at")
              .in("arrival_id", arrivalIds)
          : { data: [] },
        departureIds.length
          ? db
              .from("transport_trips")
              .select("id, departure_id, ticket_no, created_at")
              .in("departure_id", departureIds)
          : { data: [] },
      ]);

      const arrivalTicketMap = new Map<string, number[]>();
      const arrivalLastAt = new Map<string, string>();
      for (const t of arrivalTickets.data ?? []) {
        const list = arrivalTicketMap.get(t.arrival_id) ?? [];
        list.push(t.ticket_no);
        arrivalTicketMap.set(t.arrival_id, list);
        if (!arrivalLastAt.get(t.arrival_id) || t.created_at > arrivalLastAt.get(t.arrival_id)!) {
          arrivalLastAt.set(t.arrival_id, t.created_at);
        }
      }
      const departureTicketMap = new Map<string, number[]>();
      const departureLastAt = new Map<string, string>();
      for (const t of departureTickets.data ?? []) {
        const list = departureTicketMap.get(t.departure_id) ?? [];
        list.push(t.ticket_no);
        departureTicketMap.set(t.departure_id, list);
        if (!departureLastAt.get(t.departure_id) || t.created_at > departureLastAt.get(t.departure_id)!) {
          departureLastAt.set(t.departure_id, t.created_at);
        }
      }

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
          sourceId: a.id,
          ticketNos: arrivalTicketMap.get(a.id) ?? [],
          lastTicketAt: arrivalLastAt.get(a.id) ?? null,
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
          sourceId: d.id,
          ticketNos: departureTicketMap.get(d.id) ?? [],
          lastTicketAt: departureLastAt.get(d.id) ?? null,
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

  // حوار مراجعة التذكرة قبل إصدارها
  const [draft, setDraft] = useState<{
    item: Item;
    guestName: string;
    terminal: string;
    flightNo: string;
    pickup: string;
    dropoff: string;
    receiverName: string;
    receiverPhone: string;
    flightDate: string;
    flightTime: string;
    hotelName: string;
    hotelLocation: string;
    hotelMapUrl: string;
    driverId: string | null;
    vehicleId: string | null;
    notes: string;
  } | null>(null);

  const { data: drivers = [] } = useQuery({
    queryKey: ["countdown-ticket", "drivers"],
    enabled: !!draft,
    queryFn: async () => {
      const { data } = await db.from("drivers").select("id, full_name, phone").order("full_name");
      return data ?? [];
    },
  });
  const { data: vehicles = [] } = useQuery({
    queryKey: ["countdown-ticket", "vehicles"],
    enabled: !!draft,
    queryFn: async () => {
      const { data } = await db.from("vehicles").select("id, plate_number, make").order("plate_number");
      return data ?? [];
    },
  });

  const openDraft = async (item: Item) => {
    const isArrival = item.kind === "arrival";
    // تعبئة بيانات الفندق تلقائياً من حجز المتحدث إن وجد
    let hotelName = "";
    let hotelLocation = "";
    let hotelMapUrl = "";
    if (item.speakerId) {
      const { data: booking } = await db
        .from("hotel_bookings")
        .select("hotels(name, address)")
        .eq("speaker_id", item.speakerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      hotelName = booking?.hotels?.name ?? "";
      hotelLocation = booking?.hotels?.address ?? "";
    }
    // استكمال الموقع ورابط خرائط قوقل من قائمة الفنادق المعتمدة
    const known = HOTELS.find((h) => h.name === hotelName);
    if (known) {
      hotelLocation = hotelLocation || known.location;
      hotelMapUrl = known.mapUrl ?? "";
    }
    setDraft({
      item,
      guestName: item.name !== "—" ? item.name : "",
      terminal: item.terminal ?? "",
      flightNo: "",
      pickup: isArrival ? (item.point ?? "المطار") : hotelName || "الفندق",
      dropoff: isArrival ? hotelName || "الفندق" : (item.point ?? "المطار"),
      receiverName: "",
      receiverPhone: "",
      flightDate: splitDateTime(item.at).date,
      flightTime: splitDateTime(item.at).time,
      hotelName,
      hotelLocation,
      hotelMapUrl,
      driverId: null,
      vehicleId: null,
      notes: "",
    });
  };

  const issueTicket = useMutation({
    mutationFn: async ({ withPdf }: { withPdf: boolean }) => {
      if (!draft) throw new Error("لا توجد تذكرة قيد الإصدار");
      const item = draft.item;
      const isArrival = item.kind === "arrival";

      // وقت/تاريخ الرحلة القابلان للتعديل قبل الإصدار
      const customAt = draft.flightDate
        ? new Date(`${draft.flightDate}T${draft.flightTime || "00:00"}:00`)
        : new Date(item.at);
      const flightAt = Number.isNaN(customAt.getTime()) ? item.at : customAt.toISOString();

      // بطاقة واحدة فقط لكل اسم خلال الساعة الواحدة
      const cooldownStart = new Date(Date.now() - TICKET_COOLDOWN_MS).toISOString();
      const linkCol = isArrival ? "arrival_id" : "departure_id";
      const recent = await db
        .from("transport_trips")
        .select("id, created_at")
        .eq(linkCol, item.sourceId)
        .gte("created_at", cooldownStart)
        .limit(1);
      if ((recent.data ?? []).length > 0) {
        throw new Error(`تم إصدار بطاقة لـ ${item.name} خلال آخر ساعة — لا يمكن إصدار بطاقة أخرى الآن`);
      }

      const { data: inserted, error } = await db
        .from("transport_trips")
        .insert({
          event_id: item.eventId,
          speaker_id: item.speakerId,
          driver_id: draft.driverId,
          vehicle_id: draft.vehicleId,
          trip_type: isArrival ? "airport_pickup" : "airport_dropoff",
          pickup_location: draft.pickup || null,
          dropoff_location: draft.dropoff || null,
          scheduled_at: item.at,
          status: "scheduled",
          guest_name: draft.guestName || null,
          terminal: draft.terminal || null,
          flight_no: draft.flightNo || null,
          flight_at: flightAt,
          notes: draft.notes || null,
          arrival_id: isArrival ? item.sourceId : null,
          departure_id: isArrival ? null : item.sourceId,
        })
        .select("id, ticket_no")
        .single();
      if (error) throw error;

      // حفظ بطاقة توجيه السائق المرتبطة بالتذكرة (نفس سجل شاشة التذاكر)
      const driver = drivers.find((d: any) => d.id === draft.driverId);
      const vehicle = vehicles.find((v: any) => v.id === draft.vehicleId);
      const vehicleText = vehicle
        ? `${vehicle.plate_number}${vehicle.make ? ` · ${vehicle.make}` : ""}`
        : "";
      const { data: card } = await db
        .from("driver_cards")
        .insert({
          card_type: "airport",
          speaker_id: item.speakerId,
          trip_id: inserted.id,
          guest_name: draft.guestName || null,
          terminal: draft.terminal || null,
          receiver_name: draft.receiverName || null,
          receiver_phone: draft.receiverPhone || null,
          flight_at: flightAt,
          flight_no: draft.flightNo || null,
          driver_name: driver?.full_name ?? null,
          driver_phone: driver?.phone ?? null,
          vehicle: vehicleText || null,
          pickup_location: draft.pickup || null,
          dropoff_location: draft.dropoff || null,
          ticket_no: inserted.ticket_no ? String(inserted.ticket_no) : null,
          hotel_name: draft.hotelName || null,
          hotel_location: draft.hotelLocation || null,
          hotel_map_url: draft.hotelMapUrl || null,
        })
        .select("id, card_no")
        .maybeSingle();

      if (withPdf && inserted?.ticket_no) {
        openCardPdf(
          {
            cardType: "airport",
            guestName: draft.guestName,
            terminal: draft.terminal,
            receiverName: draft.receiverName,
            receiverPhone: draft.receiverPhone,
            flightDate: draft.flightDate || splitDateTime(item.at).date,
            flightTime: draft.flightTime || splitDateTime(item.at).time,
            flightNo: draft.flightNo,
            driverName: driver?.full_name ?? "",
            driverPhone: driver?.phone ?? "",
            vehicle: vehicleText,
            pickup: draft.pickup,
            dropoff: draft.dropoff,
            ticketNo: "",
            cardNo: card?.card_no ? String(card.card_no) : "",
            hotelName: draft.hotelName,
            hotelLocation: draft.hotelLocation,
            hotelMapUrl: draft.hotelMapUrl,
          },
          card?.card_no ?? inserted.ticket_no,
        );
      }
      return inserted;
    },
    onSuccess: (inserted) => {
      qc.invalidateQueries({ queryKey: ["transport-tickets"] });
      qc.invalidateQueries({ queryKey: ["fleet-trips"] });
      qc.invalidateQueries({ queryKey: ["upcoming-countdown"] });
      qc.invalidateQueries({ queryKey: ["speakers-status-board"] });
      qc.invalidateQueries({ queryKey: ["driver-card"] });
      toast.success(`تم إصدار تذكرة نقل رقم ${inserted?.ticket_no ?? ""} لـ ${draft?.guestName ?? ""}`);
      setDraft(null);
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
        <>
        <ul className="divide-y divide-border">
          {visibleItems.map((item) => {
            const diff = new Date(item.at).getTime() - tick;
            const Icon = kindMeta[item.kind].icon;
            const urgent = diff <= ALERT_MINUTES * 60 * 1000;
            const busy = issueTicket.isPending && draft?.item.id === item.id;
            const hasTicket = item.ticketNos.length > 0;
            const inCooldown =
              !!item.lastTicketAt && Date.now() - new Date(item.lastTicketAt).getTime() < TICKET_COOLDOWN_MS;
            return (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    {canEditOps && item.speakerId && !inCooldown ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => openDraft(item)}
                        title="إصدار تذكرة نقل لهذا الموعد"
                        className="group flex items-center gap-1.5 truncate text-sm font-medium text-foreground transition-colors hover:text-primary disabled:opacity-50"
                      >
                        <span className="truncate">
                          {item.name} — {kindMeta[item.kind].label}
                        </span>
                        <Ticket className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    ) : (
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.name} — {kindMeta[item.kind].label}
                      </p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {item.detail} • {new Date(item.at).toLocaleString("ar-SA-u-ca-gregory")}
                    </p>
                  </div>
                  {hasTicket && (
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      {item.ticketNos.map((no) => (
                        <Badge
                          key={no}
                          variant="default"
                          className="gap-1 bg-primary text-primary-foreground"
                          title="تذكرة نقل مصدرة"
                        >
                          <Ticket className="size-3" />
                          #{no}
                        </Badge>
                      ))}
                    </div>
                  )}
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
        {items.length > COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? "عرض أقل" : `عرض القائمة كاملة (${items.length})`}
          </button>
        )}
        </>
      )}

      {/* حوار مراجعة تذكرة النقل قبل الإصدار */}
      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="size-4 text-primary" />
              إصدار تذكرة نقل — {draft?.item.kind === "arrival" ? "وصول" : "مغادرة"}
            </DialogTitle>
            <DialogDescription>
              راجع البيانات المعبأة تلقائياً من موعد الرحلة وعدّلها قبل الحفظ.
              {draft?.item.at && (
                <> الموعد: {new Date(draft.item.at).toLocaleString("ar-SA-u-ca-gregory")}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">اسم الضيف</Label>
                <Input
                  value={draft.guestName}
                  onChange={(e) => setDraft({ ...draft, guestName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">رقم صالة المطار</Label>
                <Input
                  value={draft.terminal}
                  placeholder="مثال: صالة 1"
                  onChange={(e) => setDraft({ ...draft, terminal: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">رقم الرحلة (اختياري)</Label>
                <Input
                  value={draft.flightNo}
                  onChange={(e) => setDraft({ ...draft, flightNo: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">تاريخ الرحلة</Label>
                <Input
                  type="date"
                  dir="ltr"
                  value={draft.flightDate}
                  onChange={(e) => setDraft({ ...draft, flightDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">وقت الرحلة</Label>
                <Input
                  type="time"
                  dir="ltr"
                  value={draft.flightTime}
                  onChange={(e) => setDraft({ ...draft, flightTime: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">اسم مستقبل الضيف (اختياري)</Label>
                <Input
                  value={draft.receiverName}
                  onChange={(e) => setDraft({ ...draft, receiverName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">جوال مستقبل الضيف (اختياري)</Label>
                <Input
                  dir="ltr"
                  value={draft.receiverPhone}
                  onChange={(e) => setDraft({ ...draft, receiverPhone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">اسم الفندق (اختياري)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={HOTELS.some((h) => h.name === draft.hotelName) ? draft.hotelName : ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    const hotel = HOTELS.find((h) => h.name === name);
                    setDraft({
                      ...draft,
                      hotelName: name,
                      hotelLocation: hotel ? hotel.location : draft.hotelLocation,
                      hotelMapUrl: hotel?.mapUrl ?? draft.hotelMapUrl,
                    });
                  }}
                >
                  <option value="">اختر الفندق…</option>
                  {HOTELS.map((h) => (
                    <option key={h.name} value={h.name}>
                      {h.name}
                    </option>
                  ))}
                  {draft.hotelName && !HOTELS.some((h) => h.name === draft.hotelName) && (
                    <option value={draft.hotelName}>{draft.hotelName}</option>
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">موقع الفندق (اختياري)</Label>
                <Input
                  value={draft.hotelLocation}
                  onChange={(e) => setDraft({ ...draft, hotelLocation: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">رابط موقع الفندق (Google Maps)</Label>
                <Input
                  dir="ltr"
                  value={draft.hotelMapUrl}
                  onChange={(e) => setDraft({ ...draft, hotelMapUrl: e.target.value })}
                  placeholder="https://maps.app.goo.gl/…"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">نقطة الانطلاق</Label>
                <Input
                  value={draft.pickup}
                  onChange={(e) => setDraft({ ...draft, pickup: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">الوجهة</Label>
                <Input
                  value={draft.dropoff}
                  onChange={(e) => setDraft({ ...draft, dropoff: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">السائق (اختياري)</Label>
                <Select
                  value={draft.driverId ?? "none"}
                  onValueChange={(v) => setDraft({ ...draft, driverId: v === "none" ? null : v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="اختر سائقاً" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون سائق</SelectItem>
                    {drivers.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name}
                        {d.phone ? ` · ${d.phone}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">المركبة (اختياري)</Label>
                <Select
                  value={draft.vehicleId ?? "none"}
                  onValueChange={(v) => setDraft({ ...draft, vehicleId: v === "none" ? null : v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="اختر مركبة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون مركبة</SelectItem>
                    {vehicles.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate_number}
                        {v.make ? ` · ${v.make}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">ملاحظات (اختياري)</Label>
                <Textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              onClick={() => issueTicket.mutate({ withPdf: false })}
              disabled={issueTicket.isPending}
            >
              حفظ
            </Button>
            <Button
              variant="secondary"
              onClick={() => issueTicket.mutate({ withPdf: true })}
              disabled={issueTicket.isPending}
            >
              حفظ وتصدير PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
