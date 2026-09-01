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
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A5 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Cairo, "Segoe UI", sans-serif; color: #14213d; margin: 0; }
  .card { border: 2px solid #14213d; border-radius: 14px; padding: 18px 20px; }
  header { display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 3px solid #f77f00; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 20px; margin: 0; color: #14213d; }
  .sub { font-size: 12px; color: #64748b; margin: 4px 0 0; }
  .brand { font-size: 12px; font-weight: 700; color: #f77f00; text-align: left; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th { background: #f1f5f9; color: #14213d; text-align: right; padding: 9px 12px;
    width: 38%; font-weight: 600; border: 1px solid #e2e8f0; }
  td { padding: 9px 12px; text-align: right; border: 1px solid #e2e8f0; font-weight: 700; }
  .ticket { font-size: 12px; color: #64748b; margin-bottom: 8px; }
  footer { margin-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; }
</style></head>
<body>
  <div class="card">
    <header>
      <div>
        <h1>بطاقة توجيه السائق إلى المطار</h1>
        <p class="sub">يرجى تسليم هذه البطاقة للسائق قبل التوجه للمطار</p>
      </div>
      <div class="brand">${esc(eventName)}</div>
    </header>
    ${c.ticketNo ? `<p class="ticket">رقم التذكرة: <strong>${esc(c.ticketNo)}</strong></p>` : ""}
    <table>${rows.map(row).join("")}${extra.map(row).join("")}</table>
    <footer>صدرت آلياً من بوابة ${esc(eventName)}</footer>
  </div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 500); };<\/script>
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
