import { toast } from "sonner";

import { eventName } from "@/lib/nav";
import eventLogo from "@/assets/event-logo-2026.png";

const logoUrl = () =>
  typeof window !== "undefined" ? new URL(eventLogo, window.location.origin).href : eventLogo;

export type TicketPdfData = {
  ticketNo: number | string;
  guestName: string;
  direction: "arrival" | "departure" | "internal";
  pickup: string;
  dropoff: string;
  scheduledAt: string | null;
  terminal: string;
  flightNo: string;
  driverName: string;
  driverPhone: string;
  vehicle: string;
  notes: string;
};

function esc(v: string) {
  return (v || "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const DIR_LABEL: Record<TicketPdfData["direction"], string> = {
  arrival: "استقبال من المطار",
  departure: "توديع إلى المطار",
  internal: "مشوار داخلي",
};

export function buildTicketHtml(t: TicketPdfData) {
  const when = t.scheduledAt
    ? new Date(t.scheduledAt).toLocaleString("ar-SA-u-ca-gregory", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const rows: Array<[string, string]> = (
    [
      ["اسم الضيف", t.guestName],
      ["نوع المشوار", DIR_LABEL[t.direction] ?? ""],
      ["نقطة الانطلاق", t.pickup],
      ["الوجهة", t.dropoff],
      ["موعد الرحلة", when],
      ["رقم صالة المطار", t.terminal],
      ["رقم الرحلة", t.flightNo],
      ["السائق", t.driverName],
      ["جوال السائق", t.driverPhone],
      ["المركبة", t.vehicle],
      ["ملاحظات", t.notes],
    ] as Array<[string, string]>
  ).filter(([, v]) => v && v.trim() !== "" && v !== "—");

  const row = ([label, value]: [string, string]) =>
    `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>تذكرة-نقل-${esc(String(t.ticketNo))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet" />
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: Cairo, "Segoe UI", sans-serif; color: #0f2a4a; margin: 0; background: #fff; }
  .card { border-radius: 16px; overflow: hidden; border: 1px solid #dbe3ee;
    box-shadow: 0 4px 18px rgba(15,42,74,.08); }
  .head { background: linear-gradient(135deg, #0f2a4a 0%, #1d4677 60%, #27548f 100%);
    color: #fff; padding: 16px 22px; display: flex; align-items: center;
    justify-content: space-between; gap: 14px; }
  .logo-badge { background: #fff; border-radius: 12px; padding: 7px 11px; flex-shrink: 0;
    display: flex; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
  .logo-badge img { height: 58px; display: block; }
  .event { font-size: 12px; font-weight: 600; color: #f7a23b; margin: 0 0 4px; }
  h1 { font-size: 24px; margin: 0; font-weight: 800; }
  .sub { font-size: 12px; color: #c8d6e8; margin: 4px 0 0; }
  .accent { height: 5px; background: linear-gradient(90deg, #f77f00, #f7a23b); }
  .body { padding: 18px 22px 20px; }
  .ticket { display: inline-block; font-size: 15px; font-weight: 800; color: #b45309;
    background: #fff4e5; border: 1px solid #f7d9ac; border-radius: 999px;
    padding: 4px 18px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  th { background: #eef3f9; color: #0f2a4a; text-align: right; padding: 10px 16px;
    width: 34%; font-weight: 600; border: 1px solid #dbe3ee; }
  td { padding: 10px 16px; text-align: right; border: 1px solid #dbe3ee; font-weight: 700; }
  footer { background: #f7f9fc; border-top: 1px solid #dbe3ee; padding: 9px 22px;
    font-size: 11px; color: #7d8ea8; text-align: center; display: flex;
    align-items: center; justify-content: center; gap: 6px; }
  footer .dot { width: 6px; height: 6px; border-radius: 50%; background: #f77f00; display: inline-block; }
</style></head>
<body>
  <div class="card">
    <div class="head">
      <div>
        <p class="event">${esc(eventName)}</p>
        <h1>تذكرة نقل</h1>
        <p class="sub">${esc(DIR_LABEL[t.direction])} — يرجى تسليم هذه التذكرة للسائق</p>
      </div>
      <div class="logo-badge"><img src="${logoUrl()}" alt="شعار الفعالية" /></div>
    </div>
    <div class="accent"></div>
    <div class="body">
      <span class="ticket">رقم التذكرة: ${esc(String(t.ticketNo))}</span>
      <table>${rows.map(row).join("")}</table>
    </div>
    <footer><span class="dot"></span> صدرت آلياً من بوابة ${esc(eventName)} <span class="dot"></span> نفذ بواسطة نايف الرويس</footer>
  </div>
  <script>
    var printed = false;
    function go() { if (!printed) { printed = true; setTimeout(function () { window.print(); }, 400); } }
    window.onload = go;
    setTimeout(go, 2500);
  <\/script>
</body></html>`;
}

/** فتح نافذة طباعة التذكرة — اسم الملف الافتراضي عند الحفظ PDF هو رقم التذكرة */
export function openTicketPdf(t: TicketPdfData) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    toast.error("يرجى السماح بالنوافذ المنبثقة لتحميل التذكرة");
    return;
  }
  win.document.open();
  win.document.write(buildTicketHtml(t));
  win.document.close();
  toast.success(`جاري تجهيز تذكرة النقل رقم ${t.ticketNo} (PDF)`);
}
