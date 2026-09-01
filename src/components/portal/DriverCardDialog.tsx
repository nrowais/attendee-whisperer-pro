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
};

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
  ];
  const extra: Array<[string, string]> = [
    ["رقم الرحلة", c.flightNo],
    ["السائق", c.driverName],
    ["المركبة", c.vehicle],
    ["نقطة الانطلاق", c.pickup],
    ["الوجهة", c.dropoff],
  ].filter(([, v]) => v && v.trim() !== "") as Array<[string, string]>;

  const row = ([label, value]: [string, string]) =>
    `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;

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
      </div>
      <div class="logo-badge"><img src="${logoUrl()}" alt="شعار الفعالية" /></div>
    </div>
    <div class="accent"></div>
    <div class="body">
      ${c.ticketNo ? `<span class="ticket">رقم التذكرة: ${esc(c.ticketNo)}</span>` : ""}
      <table>${rows.map(row).join("")}${extra.map(row).join("")}</table>
    </div>
    <footer><span class="dot"></span> صدرت آلياً من بوابة ${esc(eventName)} <span class="dot"></span></footer>
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
  });

  useEffect(() => {
    if (!open) return;
    const base = trip?.flight_at ?? trip?.scheduled_at ?? null;
    const { date, time } = splitDateTime(base);
    setForm({
      guestName: trip?.guest_name ?? trip?.speaker?.full_name ?? "",
      terminal: trip?.terminal ?? "",
      receiverName: trip?.receiver_name ?? trip?.driver?.full_name ?? "",
      receiverPhone: trip?.receiver_phone ?? trip?.driver?.phone ?? "",
      flightDate: date,
      flightTime: time,
      flightNo: trip?.flight_no ?? "",
      driverName: trip?.driver?.full_name ?? "",
      vehicle: trip?.vehicle?.plate_number ?? "",
      pickup: trip?.pickup_location ?? "",
      dropoff: trip?.dropoff_location ?? "",
      ticketNo: trip?.ticket_no ? String(trip.ticket_no) : "",
    });
  }, [open, trip]);

  const save = useMutation({
    mutationFn: async () => {
      if (!trip?.id) return;
      const flightAt =
        form.flightDate && form.flightTime
          ? new Date(`${form.flightDate}T${form.flightTime}:00`).toISOString()
          : form.flightDate
            ? new Date(`${form.flightDate}T00:00:00`).toISOString()
            : null;
      const { error } = await db
        .from("transport_trips")
        .update({
          guest_name: form.guestName || null,
          terminal: form.terminal || null,
          receiver_name: form.receiverName || null,
          receiver_phone: form.receiverPhone || null,
          flight_no: form.flightNo || null,
          flight_at: flightAt,
        })
        .eq("id", trip.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport-tickets"] });
      toast.success("تم حفظ بيانات البطاقة");
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
        value={form[key]}
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
            أدخل البيانات يدوياً ثم حمّل البطاقة بصيغة PDF لتسليمها للسائق.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {field("guestName", "اسم الضيف")}
          {field("terminal", "رقم صالة المطار", "text", "مثال: صالة 1")}
          {field("receiverName", "اسم مستقبل الضيف")}
          {field("receiverPhone", "رقم جوال مستقبل الضيف", "tel", "05xxxxxxxx")}
          {field("flightTime", "وقت الرحلة", "time")}
          {field("flightDate", "تاريخ الرحلة", "date")}
          {field("flightNo", "رقم الرحلة (اختياري)")}
          {field("driverName", "اسم السائق (اختياري)")}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={() => downloadDriverCardPdf(form)}>
            <Download className="ml-1 h-4 w-4" />
            تحميل البطاقة PDF
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
