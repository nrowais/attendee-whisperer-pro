import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IdCard, Download, Save } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { eventName } from "@/lib/nav";
import eventLogo from "@/assets/event-logo-2026.png";

const logoUrl = () =>
  typeof window !== "undefined" ? new URL(eventLogo, window.location.origin).href : eventLogo;

const db = supabase as any;

export type DriverCardData = {
  guestName: string;
  terminal: string;
  receiverName: string;
  receiverPhone: string;
  flightDate: string; // yyyy-mm-dd
  flightTime: string; // HH:mm
  flightNo: string;
  driverName: string;
  vehicle: string;
  pickup: string;
  dropoff: string;
  ticketNo: string;
  cardNo?: string;
  hotelName?: string;
  hotelLocation?: string;
  hotelMapUrl?: string;
};

const HOTELS: Array<{ name: string; location: string; mapUrl?: string }> = [
  {
    name: "فندق ماريوت حي السفارات",
    location: "حي السفارات، الرياض",
    mapUrl: "https://maps.app.goo.gl/uWxNZqFduxSDVQSB6",
  },
  {
    name: "كورت يارد الرياض",
    location: "الرياض",
    mapUrl: "https://maps.app.goo.gl/Lqyq5kuELq19QdEi6",
  },
];

function esc(v: string) {
  return (v || "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function arabicDate(value: string) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ar-SA-u-ca-gregory", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function arabicTime(value: string) {
  if (!value) return "—";
  const [h, m] = value.split(":");
  const d = new Date();
  d.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
  return d.toLocaleTimeString("ar-SA-u-ca-gregory", { hour: "2-digit", minute: "2-digit" });
}

export function buildDriverCardHtml(c: DriverCardData) {
  const rows: Array<[string, string]> = [
    ["اسم الضيف", c.guestName],
    ["رقم صالة المطار", c.terminal],
    ["اسم مستقبل الضيف", c.receiverName],
    ["رقم جوال مستقبل الضيف", c.receiverPhone],
    ["وقت الرحلة", arabicTime(c.flightTime)],
    ["تاريخ الرحلة", arabicDate(c.flightDate)],
    ["اسم الفندق", c.hotelName ?? ""],
    ["موقع الفندق", c.hotelLocation ?? ""],
  ].filter(([, v]) => v && v.trim() !== "") as Array<[string, string]>;
  const extra: Array<[string, string]> = [
    ["رقم الرحلة", c.flightNo],
    ["السائق", c.driverName],
    ["المركبة", c.vehicle],
    ["نقطة الانطلاق", c.pickup],
    ["الوجهة", c.dropoff],
  ].filter(([, v]) => v && v.trim() !== "") as Array<[string, string]>;

  const mapQuery = [c.hotelName, c.hotelLocation].filter((v) => v && v.trim() !== "").join("، ");
  const fallbackUrl = mapQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`
    : "";
  const mapsUrl = c.hotelMapUrl && c.hotelMapUrl.trim() !== "" ? c.hotelMapUrl : fallbackUrl;

  const row = ([label, value]: [string, string]) => {
    const cell =
      label === "موقع الفندق" && mapsUrl
        ? `<a href="${mapsUrl}" target="_blank" rel="noopener" style="color:#1d4677;font-weight:700;">${esc(value)}</a>`
        : esc(value);
    return `<tr><th>${esc(label)}</th><td>${cell}</td></tr>`;
  };

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>بطاقة توجيه السائق</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />
<style>
  @page { size: A5 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { font-family: Cairo, "Segoe UI", sans-serif; color: #0f2a4a; margin: 0;
    background: #ffffff; }
  .card { border-radius: 16px; overflow: hidden;
    border: 1px solid #dbe3ee; box-shadow: 0 4px 18px rgba(15, 42, 74, .08); }
  .head { background: linear-gradient(135deg, #0f2a4a 0%, #1d4677 60%, #27548f 100%);
    color: #ffffff; padding: 14px 18px; display: flex; align-items: center;
    justify-content: space-between; gap: 14px; }
  .logo-badge { background: #ffffff; border-radius: 12px; padding: 6px 10px;
    display: flex; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,.15); flex-shrink: 0; }
  .logo-badge img { height: 44px; display: block; }
  .head-text { text-align: right; }
  .head-text .event { font-size: 11px; font-weight: 600; color: #f7a23b; margin: 0 0 3px; }
  h1 { font-size: 19px; margin: 0; font-weight: 800; }
  .sub { font-size: 11px; color: #c8d6e8; margin: 3px 0 0; }
  .serial { font-size: 11px; font-weight: 700; color: #f7a23b; margin: 4px 0 0; }
  .accent { height: 4px; background: linear-gradient(90deg, #f77f00, #f7a23b); }
  .body { padding: 14px 18px 16px; }
  .ticket { display: inline-block; font-size: 11px; font-weight: 700; color: #b45309;
    background: #fff4e5; border: 1px solid #f7d9ac; border-radius: 999px;
    padding: 3px 12px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #eef3f9; color: #0f2a4a; text-align: right; padding: 8px 12px;
    width: 36%; font-weight: 600; border: 1px solid #dbe3ee; }
  th:first-child { border-radius: 0 8px 0 0; }
  td { padding: 8px 12px; text-align: right; border: 1px solid #dbe3ee; font-weight: 700; }
   .maps-link { display: flex; align-items: center; justify-content: center; gap: 8px;
     margin-top: 12px; padding: 10px 14px; border-radius: 10px; text-decoration: none;
     background: linear-gradient(135deg, #0f2a4a, #1d4677); color: #ffffff;
     font-size: 13px; font-weight: 700; border: 1px solid #0f2a4a; }
   .maps-link .pin { color: #f7a23b; font-size: 15px; }
   .maps-sub { text-align: center; font-size: 10px; color: #7d8ea8; margin-top: 5px; }
   .maps-sub a { color: #1d4677; word-break: break-all; }
   @media print { .maps-link { background: #0f2a4a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
   footer { background: #f7f9fc; border-top: 1px solid #dbe3ee; padding: 8px 18px;
    font-size: 10px; color: #7d8ea8; text-align: center; display: flex;
    align-items: center; justify-content: center; gap: 6px; }
  footer .dot { width: 6px; height: 6px; border-radius: 50%; background: #f77f00; display: inline-block; }
</style></head>
<body>
  <div class="card">
    <div class="head">
      <div class="head-text">
        <p class="event">${esc(eventName)}</p>
        <h1>بطاقة توجيه السائق إلى المطار</h1>
        <p class="sub">يرجى تسليم هذه البطاقة للسائق قبل التوجه للمطار</p>
        ${c.cardNo ? `<p class="serial">رقم البطاقة التسلسلي: ${esc(String(c.cardNo))}</p>` : ""}
      </div>
      <div class="logo-badge"><img src="${logoUrl()}" alt="شعار الفعالية" /></div>
    </div>
    <div class="accent"></div>
    <div class="body">
      ${c.cardNo ? `<span class="ticket">رقم البطاقة: ${esc(String(c.cardNo))}</span>` : ""}
      ${c.ticketNo ? `<span class="ticket">رقم التذكرة: ${esc(c.ticketNo)}</span>` : ""}
      <table>${rows.map(row).join("")}${extra.map(row).join("")}</table>
      ${mapsUrl ? `
      <a class="maps-link" href="${mapsUrl}" target="_blank" rel="noopener">
        <span class="pin">📍</span> فتح موقع الفندق في خرائط قوقل
      </a>
      <p class="maps-sub">اضغط على الزر أو الرابط للوصول المباشر إلى الموقع: <a href="${mapsUrl}">${mapsUrl}</a></p>` : ""}
    </div>
    <footer><span class="dot"></span> صدرت آلياً من بوابة ${esc(eventName} <span class="dot"></span> نفذ بواسطة نايف الرويس</footer>
  </div>
  <script>
    var printed = false;
    function go() { if (!printed) { printed = true; setTimeout(function () { window.print(); }, 400); } }
    window.onload = go;
    setTimeout(go, 2500);
  <\/script>
</body></html>`;
}

export function downloadDriverCardPdf(c: DriverCardData) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    toast.error("يرجى السماح بالنوافذ المنبثقة لتحميل البطاقة");
    return;
  }
  win.document.open();
  win.document.write(buildDriverCardHtml(c));
  win.document.close();
  toast.success("جاري تجهيز بطاقة السائق (PDF)");
}

type Props = {
  trip?: any;
  canEdit?: boolean;
  trigger?: React.ReactNode;
};

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

export function DriverCardDialog({ trip, canEdit = false, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const [form, setForm] = useState<DriverCardData>({
    guestName: "",
    terminal: "",
    receiverName: "",
    receiverPhone: "",
    flightDate: "",
    flightTime: "",
    flightNo: "",
    driverName: "",
    vehicle: "",
    pickup: "",
    dropoff: "",
    ticketNo: "",
    hotelName: "",
    hotelLocation: "",
    hotelMapUrl: "",
  });

  const [cardId, setCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base = trip?.flight_at ?? trip?.scheduled_at ?? null;
    const { date, time } = splitDateTime(base);
    setCardId(null);
    setForm({
      guestName: trip?.guest_name ?? trip?.speaker?.full_name ?? "",
      terminal: trip?.terminal ?? "",
      receiverName: trip?.receiver_name ?? "",
      receiverPhone: trip?.receiver_phone ?? "",
      flightDate: date,
      flightTime: time,
      flightNo: trip?.flight_no ?? "",
      driverName: trip?.driver?.full_name ?? "",
      vehicle: trip?.vehicle?.plate_number ?? "",
      pickup: trip?.pickup_location ?? "",
      dropoff: trip?.dropoff_location ?? "",
      ticketNo: trip?.ticket_no ? String(trip.ticket_no) : "",
      cardNo: "",
      hotelName: trip?.hotel_name ?? "",
      hotelLocation: trip?.hotel_location ?? "",
      hotelMapUrl: trip?.hotel_map_url ?? "",
    });

    // استرجاع بطاقة محفوظة سابقاً لهذا الضيف/التذكرة
    (async () => {
      let q = db.from("driver_cards").select("*").order("created_at", { ascending: false }).limit(1);
      if (trip?.id) q = q.eq("trip_id", trip.id);
      else if (trip?.speaker_id) q = q.eq("speaker_id", trip.speaker_id);
      else if (trip?.speaker?.full_name) q = q.eq("guest_name", trip.speaker.full_name);
      else return;
      const { data } = await q;
      const row = data?.[0];
      if (!row) return;
      const dt = splitDateTime(row.flight_at);
      setCardId(row.id);
      setForm((f) => ({
        ...f,
        cardNo: String(row.card_no),
        guestName: row.guest_name ?? f.guestName,
        terminal: row.terminal ?? f.terminal,
        receiverName: row.receiver_name ?? f.receiverName,
        receiverPhone: row.receiver_phone ?? f.receiverPhone,
        flightDate: dt.date || f.flightDate,
        flightTime: dt.time || f.flightTime,
        flightNo: row.flight_no ?? f.flightNo,
        driverName: row.driver_name ?? f.driverName,
        hotelName: row.hotel_name ?? f.hotelName,
        hotelLocation: row.hotel_location ?? f.hotelLocation,
        hotelMapUrl: row.hotel_map_url ?? f.hotelMapUrl,
      }));
    })();
  }, [open, trip]);

  const flightIso = () =>
    form.flightDate && form.flightTime
      ? new Date(`${form.flightDate}T${form.flightTime}:00`).toISOString()
      : form.flightDate
        ? new Date(`${form.flightDate}T00:00:00`).toISOString()
        : null;

  // حفظ البطاقة في ملف الضيف مع رقم تسلسلي
  const persistCard = async (): Promise<DriverCardData> => {
    const payload = {
      speaker_id: trip?.speaker_id ?? trip?.speaker?.id ?? null,
      trip_id: trip?.id ?? null,
      guest_name: form.guestName || null,
      terminal: form.terminal || null,
      receiver_name: form.receiverName || null,
      receiver_phone: form.receiverPhone || null,
      flight_at: flightIso(),
      flight_no: form.flightNo || null,
      driver_name: form.driverName || null,
      vehicle: form.vehicle || null,
      pickup_location: form.pickup || null,
      dropoff_location: form.dropoff || null,
      ticket_no: form.ticketNo || null,
      hotel_name: form.hotelName || null,
      hotel_location: form.hotelLocation || null,
      hotel_map_url: form.hotelMapUrl || null,
    };
    const query = cardId
      ? db.from("driver_cards").update(payload).eq("id", cardId).select("id, card_no").maybeSingle()
      : db.from("driver_cards").insert(payload).select("id, card_no").maybeSingle();
    const { data, error } = await query;
    if (error) throw error;
    if (data) {
      setCardId(data.id);
      setForm((f) => ({ ...f, cardNo: String(data.card_no) }));
      return { ...form, cardNo: String(data.card_no) };
    }
    return form;
  };

  const issue = useMutation({
    mutationFn: persistCard,
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["crud", "driver_cards"] });
      toast.success(`تم حفظ البطاقة في ملف الضيف برقم ${c.cardNo ?? ""}`);
    },
    onError: (e: any) => toast.error(e.message ?? "تعذر حفظ البطاقة"),
  });

  const saveAndDownload = async () => {
    let card = form;
    try {
      card = await issue.mutateAsync();
    } catch {
      // نُكمل التحميل حتى لو تعذر الحفظ
    }
    downloadDriverCardPdf(card);
  };

  const save = useMutation({
    mutationFn: async () => {
      await persistCard();
      if (!trip?.id) return;
      const { error } = await db
        .from("transport_trips")
        .update({
          guest_name: form.guestName || null,
          terminal: form.terminal || null,
          receiver_name: form.receiverName || null,
          receiver_phone: form.receiverPhone || null,
          flight_no: form.flightNo || null,
          flight_at: flightIso(),
        })
        .eq("id", trip.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport-tickets"] });
      qc.invalidateQueries({ queryKey: ["crud", "driver_cards"] });
      toast.success("تم حفظ بيانات البطاقة في ملف الضيف");
    },
    onError: (e: any) => toast.error(e.message ?? "تعذر الحفظ"),
  });

  const field = (
    key: keyof DriverCardData,
    label: string,
    type: string = "text",
    placeholder?: string,
  ) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={form[key] ?? ""}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <IdCard className="ml-1 h-4 w-4" />
            بطاقة السائق
          </Button>
        )}
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle>بطاقة توجيه السائق إلى المطار</DialogTitle>
          <DialogDescription>
            تُحفظ البطاقة في ملف الضيف برقم تسلسلي تلقائي عند التحميل.
          </DialogDescription>
        </DialogHeader>

        {form.cardNo && (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-bold text-accent-foreground">
            رقم البطاقة التسلسلي: {form.cardNo}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {field("guestName", "اسم الضيف")}
          {field("terminal", "رقم صالة المطار", "text", "مثال: صالة 1")}
          {field("receiverName", "اسم مستقبل الضيف")}
          {field("receiverPhone", "رقم جوال مستقبل الضيف", "tel", "05xxxxxxxx")}
          {field("flightTime", "وقت الرحلة", "time")}
          {field("flightDate", "تاريخ الرحلة", "date")}
          {field("flightNo", "رقم الرحلة (اختياري)")}
          {field("driverName", "اسم السائق (اختياري)")}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">اسم الفندق</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.hotelName ?? ""}
              onChange={(e) => {
                const name = e.target.value;
                const hotel = HOTELS.find((h) => h.name === name);
                setForm((f) => ({
                  ...f,
                  hotelName: name,
                  hotelLocation: hotel ? hotel.location : (f.hotelLocation ?? ""),
                  hotelMapUrl: hotel?.mapUrl ?? (f.hotelMapUrl ?? ""),
                }));
              }}
            >
              <option value="">اختر الفندق…</option>
              {HOTELS.map((h) => (
                <option key={h.name} value={h.name}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          {field("hotelLocation", "موقع الفندق", "text", "مثال: حي السفارات، الرياض")}
          {field("hotelMapUrl", "رابط موقع الفندق (اختياري)", "url", "https://maps.app.goo.gl/...")}
          {form.hotelMapUrl && (
            <div className="space-y-1 sm:col-span-2">
              <a
                href={form.hotelMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-primary underline hover:bg-muted"
              >
                📍 فتح موقع {form.hotelName || "الفندق"} في خرائط قوقل
              </a>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={saveAndDownload} disabled={issue.isPending}>
            <Download className="ml-1 h-4 w-4" />
            حفظ وتحميل البطاقة PDF
          </Button>
          {canEdit && trip?.id && (
            <Button variant="outline" onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="ml-1 h-4 w-4" />
              حفظ البيانات
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
