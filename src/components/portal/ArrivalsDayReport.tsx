import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Download, PlaneLanding, Ticket } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { eventName } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildDriverCardHtml,
  driverCardFileName,
  type DriverCardData,
} from "@/components/portal/DriverCardDialog";
import eventLogo from "@/assets/event-logo-2026.png";

const db = supabase as any;

const logoUrl = () =>
  typeof window !== "undefined" ? new URL(eventLogo, window.location.origin).href : eventLogo;

const statusLabels: Record<string, string> = {
  scheduled: "مجدول",
  in_transit: "في الطريق",
  arrived: "وصل",
  delayed: "متأخر",
  cancelled: "ملغي",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function splitDateTime(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function timeLabel(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("ar-SA-u-ca-gregory", { hour: "2-digit", minute: "2-digit" });
}

function esc(v: any) {
  return String(v ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type Row = {
  id: string;
  name: string;
  org: string;
  country: string;
  time: string | null;
  point: string;
  terminal: string;
  flight: string;
  status: string;
  ticketNo: number | null;
};

export function ArrivalsDayReport() {
  const [day, setDay] = useState("2026-09-05");

  const query = useQuery({
    queryKey: ["report", "arrivals-day", day],
    queryFn: async (): Promise<Row[]> => {
      const from = `${day}T00:00:00`;
      const to = `${day}T23:59:59`;
      const { data, error } = await db
        .from("speaker_arrivals")
        .select(
          "id, arrival_time, arrival_point, terminal, status, speakers(full_name, organization, country), flights(airline, flight_number)",
        )
        .gte("arrival_time", from)
        .lte("arrival_time", to)
        .order("arrival_time", { ascending: true });
      if (error) throw error;

      const ids = (data ?? []).map((r: any) => r.id);
      let tickets: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: trips } = await db
          .from("transport_trips")
          .select("arrival_id, ticket_no")
          .in("arrival_id", ids);
        for (const t of trips ?? []) {
          if (t.arrival_id && t.ticket_no) tickets[t.arrival_id] = t.ticket_no;
        }
      }

      return (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.speakers?.full_name ?? "—",
        org: r.speakers?.organization ?? "—",
        country: r.speakers?.country ?? "—",
        time: r.arrival_time ?? null,
        point: r.arrival_point ?? "—",
        terminal: r.terminal ?? "—",
        flight: r.flights
          ? `${r.flights.airline ?? ""} ${r.flights.flight_number ?? ""}`.trim() || "—"
          : "—",
        status: statusLabels[r.status] ?? r.status ?? "—",
        ticketNo: tickets[r.id] ?? null,
      }));
    },
  });

  const rows = query.data ?? [];

  const openCard = useMutation({
    mutationFn: async (ticketNo: number) => {
      const { data: card, error } = await db
        .from("driver_cards")
        .select("*")
        .eq("ticket_no", String(ticketNo))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!card) throw new Error("لا توجد بطاقة محفوظة لهذه التذكرة");
      const { date, time } = splitDateTime(card.flight_at ?? null);
      const data: DriverCardData = {
        cardType: card.card_type ?? "airport",
        guestName: card.guest_name ?? "",
        terminal: card.terminal ?? "",
        receiverName: card.receiver_name ?? "",
        receiverPhone: card.receiver_phone ?? "",
        flightDate: date,
        flightTime: time,
        flightNo: card.flight_no ?? "",
        driverName: card.driver_name ?? "",
        driverPhone: card.driver_phone ?? "",
        vehicle: card.vehicle ?? "",
        pickup: card.pickup_location ?? "",
        dropoff: card.dropoff_location ?? "",
        ticketNo: String(ticketNo),
        hotelName: card.hotel_name ?? "",
        hotelLocation: card.hotel_location ?? "",
        hotelMapUrl: card.hotel_map_url ?? "",
        notes: card.notes ?? "",
      };
      const fileName = driverCardFileName(data);
      const html = buildDriverCardHtml(data).replace(
        "<title>بطاقة توجيه السائق</title>",
        `<title>${fileName}</title>`,
      );
      return { html, fileName };
    },
    onSuccess: ({ html, fileName }) => {
      const win = window.open("", "_blank", "width=900,height=700");
      if (!win) {
        toast.error("يرجى السماح بالنوافذ المنبثقة لفتح البطاقة");
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.document.title = fileName;
    },
    onError: (e: any) => toast.error(e.message ?? "تعذر فتح البطاقة"),
  });

  function exportPdf() {
    if (rows.length === 0) {
      toast.error("لا توجد بيانات لهذا اليوم");
      return;
    }
    const win = window.open("", "_blank", "width=1000,height=760");
    if (!win) {
      toast.error("يرجى السماح بالنوافذ المنبثقة لتصدير PDF");
      return;
    }
    const dayLabel = new Date(`${day}T12:00:00`).toLocaleDateString("ar-SA-u-ca-gregory", {
      dateStyle: "full",
    });
    const body = rows
      .map(
        (r, i) => `<tr>
        <td class="num">${i + 1}</td>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.org)}</td>
        <td>${esc(r.country)}</td>
        <td>${esc(timeLabel(r.time))}</td>
        <td>${esc(r.flight)}</td>
        <td>${esc(r.point)}</td>
        <td>${esc(r.terminal)}</td>
        <td>${esc(r.status)}</td>
        <td>${r.ticketNo ? esc(r.ticketNo) : "—"}</td>
      </tr>`,
      )
      .join("");

    const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>تقرير الضيوف الواصلين ${esc(day)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Cairo, "Segoe UI", sans-serif; color: #14213d; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: center;
    border-bottom: 3px solid #14213d; padding-bottom: 12px; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { font-size: 12px; color: #64748b; margin: 0; }
  .brand { font-size: 13px; font-weight: 700; color: #e8751a; margin-top: 6px; }
  .logo-badge { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px 10px; }
  .logo-badge img { height: 56px; display: block; }
  .meta { display: flex; gap: 18px; font-size: 12px; color: #64748b; margin-bottom: 12px;
    border-right: 4px solid #e8751a; padding-right: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #14213d; color: #fff; text-align: right; padding: 8px 10px; font-weight: 600; }
  tbody td { border-bottom: 1px solid #e2e8f0; padding: 7px 10px; text-align: right; }
  tbody tr:nth-child(even) td { background: #f6f8fc; }
  td.num { color: #94a3b8; width: 34px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  footer { margin-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;
    border-top: 2px solid #e8751a; padding-top: 8px; }
</style></head>
<body>
  <header>
    <div>
      <h1>تقرير الضيوف الواصلين</h1>
      <p class="sub">${esc(dayLabel)}</p>
      <div class="brand">${eventName}</div>
    </div>
    <div class="logo-badge"><img src="${logoUrl()}" alt="شعار الفعالية" /></div>
  </header>
  <div class="meta"><span>عدد الواصلين: <strong>${rows.length}</strong></span><span>عدد التذاكر المصدرة: <strong>${rows.filter((r) => r.ticketNo).length}</strong></span></div>
  <table><thead><tr>
    <th>#</th><th>الضيف</th><th>الجهة</th><th>الدولة</th><th>وقت الوصول</th>
    <th>الرحلة</th><th>نقطة الوصول</th><th>الصالة</th><th>الحالة</th><th>رقم التذكرة</th>
  </tr></thead><tbody>${body}</tbody></table>
  <footer>تم إنشاء هذا التقرير آلياً من بوابة ${eventName}<br/>نفذ بواسطة نايف الرويس</footer>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 700); };<\/script>
</body></html>`;

    win.document.open();
    win.document.write(html);
    win.document.close();
    toast.success("جاري تجهيز ملف PDF");
  }

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-secondary p-2.5 text-primary">
            <PlaneLanding className="size-5" />
          </span>
          <div>
            <p className="font-display text-base font-bold text-foreground">
              تقرير الضيوف الواصلين
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              اختر اليوم لعرض الواصلين وتذاكرهم، واضغط على رقم التذكرة لفتح البطاقة وتصديرها PDF.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-[170px]"
          />
          <Button variant="outline" onClick={exportPdf}>
            <Download className="size-4" />
            تصدير PDF
          </Button>
        </div>
      </div>

      <div className="mt-5">
        {query.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            لا يوجد ضيوف واصلون في هذا اليوم.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-right text-sm">
              <thead className="bg-secondary text-secondary-foreground">
                <tr>
                  <th className="p-3 font-semibold">#</th>
                  <th className="p-3 font-semibold">الضيف</th>
                  <th className="p-3 font-semibold">الجهة</th>
                  <th className="p-3 font-semibold">وقت الوصول</th>
                  <th className="p-3 font-semibold">الرحلة</th>
                  <th className="p-3 font-semibold">الصالة</th>
                  <th className="p-3 font-semibold">الحالة</th>
                  <th className="p-3 font-semibold">البطاقة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 text-muted-foreground">{i + 1}</td>
                    <td className="p-3 font-medium text-foreground">{r.name}</td>
                    <td className="p-3 text-muted-foreground">{r.org}</td>
                    <td className="p-3">{timeLabel(r.time)}</td>
                    <td className="p-3 text-muted-foreground">{r.flight}</td>
                    <td className="p-3 text-muted-foreground">{r.terminal}</td>
                    <td className="p-3 text-muted-foreground">{r.status}</td>
                    <td className="p-3">
                      {r.ticketNo ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCard.mutate(r.ticketNo as number)}
                          disabled={openCard.isPending}
                        >
                          <Ticket className="size-4" />
                          {r.ticketNo}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
