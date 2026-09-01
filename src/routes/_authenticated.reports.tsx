import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { eventName } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import eventLogo from "@/assets/event-logo-2026.png";

const logoUrl = () =>
  typeof window !== "undefined" ? new URL(eventLogo, window.location.origin).href : eventLogo;

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير — حوار الأمن والتاريخ" },
      { name: "description", content: "تقارير تشغيلية بأرقام حقيقية قابلة للتصدير بصيغة CSV." },
      { property: "og:title", content: "التقارير — حوار الأمن والتاريخ" },
      { property: "og:description", content: "تقارير الحضور والوصول والنقل والإقامة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const db = supabase as any;

type ReportDef = {
  key: string;
  title: string;
  desc: string;
  table: string;
  columns: { key: string; label: string }[];
  select: string;
};

const reports: ReportDef[] = [
  {
    key: "speakers",
    title: "تقرير المتحدثين",
    desc: "بيانات المتحدثين وجهاتهم ودولهم.",
    table: "speakers",
    select: "full_name, title, organization, country, email, phone",
    columns: [
      { key: "full_name", label: "الاسم" },
      { key: "title", label: "الصفة" },
      { key: "organization", label: "الجهة" },
      { key: "country", label: "الدولة" },
    ],
  },
  {
    key: "arrivals",
    title: "تقرير الوصول",
    desc: "حركات وصول المتحدثين وحالتها.",
    table: "speaker_arrivals",
    select:
      "arrival_time, arrival_point, status, speakers(full_name), flights(airline, flight_number)",
    columns: [
      { key: "speakers_name", label: "المتحدث" },
      { key: "flights_name", label: "الرحلة" },
      { key: "arrival_time", label: "الوقت" },
      { key: "arrival_point", label: "النقطة" },
      { key: "status", label: "الحالة" },
    ],
  },
  {
    key: "trips",
    title: "تقرير النقل",
    desc: "رحلات النقل الأرضي ومواعيدها وحالتها.",
    table: "transport_trips",
    select:
      "trip_type, pickup_location, dropoff_location, scheduled_at, status, speakers(full_name), drivers(full_name), vehicles(plate_number)",
    columns: [
      { key: "speakers_name", label: "المتحدث" },
      { key: "drivers_name", label: "السائق" },
      { key: "vehicles_name", label: "المركبة" },
      { key: "trip_type", label: "النوع" },
      { key: "pickup_location", label: "من" },
      { key: "dropoff_location", label: "إلى" },
      { key: "scheduled_at", label: "الموعد" },
      { key: "status", label: "الحالة" },
    ],
  },
  {
    key: "bookings",
    title: "تقرير الإقامة",
    desc: "حجوزات الفنادق وتواريخ الدخول والخروج.",
    table: "hotel_bookings",
    select:
      "check_in, check_out, status, notes, speakers(full_name), hotels(name), hotel_rooms(room_number)",
    columns: [
      { key: "speakers_name", label: "المتحدث" },
      { key: "hotels_name", label: "الفندق" },
      { key: "hotel_rooms_name", label: "الغرفة" },
      { key: "check_in", label: "الدخول" },
      { key: "check_out", label: "الخروج" },
      { key: "status", label: "الحالة" },
    ],
  },
  {
    key: "attendance",
    title: "تقرير الحضور",
    desc: "سجل تسجيل الحضور في موقع الفعالية.",
    table: "attendance",
    select: "checked_in_at, method, invitees(full_name, organization)",
    columns: [
      { key: "invitees_name", label: "المدعو" },
      { key: "checked_in_at", label: "وقت التسجيل" },
      { key: "method", label: "الطريقة" },
    ],
  },
  {
    key: "requests",
    title: "تقرير الطلبات الخاصة",
    desc: "الطلبات وحالتها وأولويتها.",
    table: "speaker_requests",
    select: "title, priority, status, details, speakers(full_name), request_categories(name)",
    columns: [
      { key: "speakers_name", label: "المتحدث" },
      { key: "request_categories_name", label: "التصنيف" },
      { key: "title", label: "الطلب" },
      { key: "priority", label: "الأولوية" },
      { key: "status", label: "الحالة" },
    ],
  },
];

function flattenNames(row: Record<string, any>) {
  const out: Record<string, any> = { ...row };
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const rel = v as Record<string, any>;
      const label =
        rel["full_name"] ??
        rel["name"] ??
        rel["room_number"] ??
        rel["plate_number"] ??
        (rel["airline"] || rel["flight_number"]
          ? `${rel["airline"] ?? ""} ${rel["flight_number"] ?? ""}`.trim()
          : null);
      out[`${k}_name`] = label ?? "—";
      delete out[k];
    }
  }
  return out;
}


function esc(v: any) {
  return String(v ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmt(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}([T ]|$)/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) {
      return v.length <= 10
        ? d.toLocaleDateString("ar-SA-u-ca-gregory")
        : d.toLocaleString("ar-SA-u-ca-gregory", {
            dateStyle: "medium",
            timeStyle: "short",
          });
    }
  }
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return String(v);
}

function buildReportHtml(report: ReportDef, rows: Record<string, any>[]) {
  const now = new Date().toLocaleString("ar-SA-u-ca-gregory", {
    dateStyle: "full",
    timeStyle: "short",
  });
  const head = report.columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
  const body = rows
    .map(
      (r, i) =>
        `<tr><td class="num">${i + 1}</td>${report.columns
          .map((c) => `<td>${esc(fmt(r[c.key]))}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" />
<title>${esc(report.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Cairo, "Segoe UI", sans-serif; color: #14213d; margin: 0; }
  header { display: flex; justify-content: space-between; align-items: center;
    border-bottom: 3px solid #14213d; padding-bottom: 12px; margin-bottom: 18px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #14213d; }
  .sub { font-size: 12px; color: #64748b; margin: 0; }
  .brand { font-size: 13px; font-weight: 700; color: #e8751a; text-align: left; margin-top: 6px; }
  .logo-badge { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px 10px; }
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
      <h1>${esc(report.title)}</h1>
      <p class="sub">${esc(report.desc)}</p>
      <div class="brand">${eventName}</div>
    </div>
    <div class="logo-badge"><img src="${logoUrl()}" alt="شعار الفعالية" /></div>
  </header>
  <div class="meta"><span>عدد السجلات: <strong>${rows.length}</strong></span><span>تاريخ التقرير: ${esc(now)}</span></div>
  <table><thead><tr><th>#</th>${head}</tr></thead><tbody>${body}</tbody></table>
  <footer>تم إنشاء هذا التقرير آلياً من بوابة ${eventName}<br/>نفذ بواسطة نايف الرويس</footer>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 700); };<\/script>
</body></html>`;
}

function ReportCard({ report }: { report: ReportDef }) {
  const query = useQuery({
    queryKey: ["report", report.key],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await db.from(report.table).select(report.select).limit(1000);
      if (error) throw error;
      return ((data ?? []) as Record<string, any>[]).map(flattenNames);
    },
  });

  const rows = query.data ?? [];

  function exportPdf() {
    if (rows.length === 0) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    const win = window.open("", "_blank", "width=1000,height=760");
    if (!win) {
      toast.error("يرجى السماح بالنوافذ المنبثقة لتصدير PDF");
      return;
    }
    win.document.open();
    win.document.write(buildReportHtml(report, rows));
    win.document.close();
    toast.success("جاري تجهيز ملف PDF");
  }

  return (
    <div className="surface-card flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-bold text-foreground">{report.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.desc}</p>
        </div>
        <span className="rounded-xl bg-secondary p-2.5 text-primary">
          <FileBarChart className="size-5" />
        </span>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : (
        <p className="font-display text-3xl font-bold text-foreground">
          {rows.length}
          <span className="ms-2 text-sm font-normal text-muted-foreground">سجل</span>
        </p>
      )}

      <Button variant="outline" onClick={exportPdf} className="mt-auto w-full">
        <Download className="size-4" />
        تصدير PDF
      </Button>
    </div>
  );
}


function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">التقارير</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          أرقام حقيقية من قاعدة البيانات مع إمكانية التصدير إلى ملف PDF مرتب وجاهز للطباعة.

        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <ReportCard key={r.key} report={r} />
        ))}
      </div>
    </div>
  );
}
