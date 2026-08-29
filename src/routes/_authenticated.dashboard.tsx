import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Mic,
  Users,
  PlaneLanding,
  Car,
  BedDouble,
  ClipboardList,
  UserCheck,
  AlertTriangle,
  ArrowLeft,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { eventName } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "المتابعة اللحظية — حوار الأمن والتاريخ" },
      { name: "description", content: "أرقام وإحصائيات لحظية عن المتحدثين والحضور والتحركات والإقامة." },
      { property: "og:title", content: "المتابعة اللحظية — حوار الأمن والتاريخ" },
      { property: "og:description", content: "حالة الفعالية لحظة بلحظة في شاشة واحدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

const db = supabase as any;

async function count(table: string, filter?: (q: any) => any) {
  let q = db.from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}

function useLiveStats() {
  return useQuery({
    queryKey: ["live-stats"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
      const nowIso = now.toISOString();

      const [
        speakers,
        invitees,
        arrivalsTotal,
        arrived,
        tripsTotal,
        tripsActive,
        bookingsTotal,
        checkedIn,
        attendance,
        requestsOpen,
        alertsPending,
      ] = await Promise.all([
        count("speakers"),
        count("invitees"),
        count("speaker_arrivals"),
        count("speaker_arrivals", (q: any) => q.eq("status", "arrived")),
        count("transport_trips"),
        count("transport_trips", (q: any) => q.eq("status", "in_progress")),
        count("hotel_bookings"),
        count("hotel_bookings", (q: any) => q.eq("status", "checked_in")),
        count("attendance"),
        count("speaker_requests", (q: any) => q.in("status", ["open", "in_progress"])),
        count("flight_alerts", (q: any) => q.eq("status", "pending")),
      ]);

      const { data: upcoming } = await db
        .from("speaker_arrivals")
        .select("id, arrival_time, arrival_point, status, speakers(full_name)")
        .gte("arrival_time", nowIso)
        .lte("arrival_time", soon)
        .order("arrival_time", { ascending: true })
        .limit(6);

      const { data: nextTrips } = await db
        .from("transport_trips")
        .select("id, scheduled_at, pickup_location, dropoff_location, status, speakers(full_name)")
        .gte("scheduled_at", nowIso)
        .lte("scheduled_at", soon)
        .order("scheduled_at", { ascending: true })
        .limit(6);

      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayStartIso = dayStart.toISOString();
      const dayEndIso = dayEnd.toISOString();
      const todayDate = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, "0")}-${String(
        dayStart.getDate(),
      ).padStart(2, "0")}`;

      const [todayAttendance, todayTrips, todayCheckIns, todayArrivals] = await Promise.all([
        count("attendance", (q: any) => q.gte("checked_in_at", dayStartIso).lt("checked_in_at", dayEndIso)),
        count("transport_trips", (q: any) => q.gte("scheduled_at", dayStartIso).lt("scheduled_at", dayEndIso)),
        count("hotel_bookings", (q: any) => q.eq("check_in", todayDate)),
        count("speaker_arrivals", (q: any) => q.gte("arrival_time", dayStartIso).lt("arrival_time", dayEndIso)),
      ]);

      const { data: alerts } = await db
        .from("flight_alerts")
        .select("id, message, alert_type, due_at, status")
        .eq("status", "pending")
        .order("due_at", { ascending: true })
        .limit(5);

      return {
        speakers,
        invitees,
        arrivalsTotal,
        arrived,
        tripsTotal,
        tripsActive,
        bookingsTotal,
        checkedIn,
        attendance,
        requestsOpen,
        alertsPending,
        todayAttendance,
        todayTrips,
        todayCheckIns,
        todayArrivals,
        upcoming: upcoming ?? [],
        nextTrips: nextTrips ?? [],
        alerts: alerts ?? [],
      };
    },
  });
}

function fmtTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-SA-u-ca-gregory", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  to,
}: {
  icon: typeof Mic;
  label: string;
  value: number | string;
  sub?: string;
  to: string;
}) {
  return (
    <Link to={to} className="surface-card group block p-5 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold text-foreground">{value}</p>
          {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
        </div>
        <span className="rounded-xl bg-secondary p-2.5 text-primary">
          <Icon className="size-5" />
        </span>
      </div>
    </Link>
  );
}

function ProgressRow({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {done} / {total} ({pct}%)
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function todayLabel() {
  return new Date().toLocaleDateString("ar-SA-u-ca-gregory", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function exportSummaryCsv(rows: { label: string; value: number | string }[]) {
  const lines = [["البند", "القيمة"], ...rows.map((r) => [r.label, String(r.value)])]
    .map((cols) => cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + `الملخص اليومي - ${todayLabel()}\n\n` + lines], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `daily-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportSummaryPdf(rows: { label: string; value: number | string }[]) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  const body = rows
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td>${r.label}</td><td class="num">${r.value}</td></tr>`,
    )
    .join("");
  win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>الملخص اليومي</title>
<style>
@page { size: A4; margin: 18mm; }
body { font-family: "Tajawal","Cairo",system-ui,sans-serif; color:#1c2333; }
h1 { font-size: 20px; margin:0 0 4px; }
p.meta { color:#5b657d; font-size:12px; margin:0 0 20px; }
table { width:100%; border-collapse:collapse; font-size:13px; }
th,td { border:1px solid #d7dce8; padding:9px 10px; text-align:right; }
thead th { background:#3c4c9c; color:#fff; }
tbody tr:nth-child(even) { background:#f4f6fb; }
td.num { font-weight:700; }
footer { margin-top:24px; font-size:11px; color:#7b8497; text-align:center; }
</style></head><body>
<h1>${eventName} — الملخص اليومي</h1>
<p class="meta">${todayLabel()}</p>
<table><thead><tr><th style="width:48px">#</th><th>البند</th><th style="width:120px">القيمة</th></tr></thead>
<tbody>${body}</tbody></table>
<footer>تم إنشاء التقرير آليًا من بوابة ${eventName}</footer>
</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

function DashboardPage() {
  const { data, isLoading } = useLiveStats();


  const summaryCards = [
    { label: "الحضور اليوم", value: data?.todayAttendance ?? 0, sub: "تسجيل دخول في الموقع", icon: UserCheck },
    { label: "رحلات نقل اليوم", value: data?.todayTrips ?? 0, sub: "مجدولة خلال اليوم", icon: Car },
    { label: "تسجيل إقامة اليوم", value: data?.todayCheckIns ?? 0, sub: "دخول الفنادق", icon: BedDouble },
    { label: "وصول اليوم", value: data?.todayArrivals ?? 0, sub: "حركات وصول مجدولة", icon: PlaneLanding },
  ];
  const summaryRows = summaryCards.map(({ label, value }) => ({ label, value }));

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">المتابعة اللحظية</h1>
          <p className="mt-1 text-sm text-muted-foreground">{eventName} — حالة الفعالية الآن</p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          تحديث تلقائي كل 30 ثانية
        </Badge>
      </div>

      <section className="surface-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-bold text-foreground">الملخص اليومي</p>
            <span className="text-xs text-muted-foreground">{todayLabel()}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => exportSummaryCsv(summaryRows)}>
              <FileSpreadsheet className="size-4" />
              CSV
            </Button>
            <Button size="sm" className="gap-2" onClick={() => exportSummaryPdf(summaryRows)}>
              <FileDown className="size-4" />
              PDF
            </Button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <item.icon className="size-4 text-primary" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold text-foreground">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Mic} label="المتحدثون" value={data.speakers} sub="مسجلون في النظام" to="/speakers" />
        <Kpi icon={Users} label="المدعوون" value={data.invitees} sub="إجمالي قائمة الدعوات" to="/invitees" />
        <Kpi
          icon={PlaneLanding}
          label="تم وصولهم"
          value={`${data.arrived} / ${data.arrivalsTotal}`}
          sub="من حركات الوصول المسجلة"
          to="/movements"
        />
        <Kpi icon={UserCheck} label="الحضور المسجل" value={data.attendance} sub="تسجيل في الموقع" to="/invitees" />
        <Kpi icon={Car} label="رحلات النقل" value={data.tripsTotal} sub={`${data.tripsActive} جارية الآن`} to="/trips" />
        <Kpi
          icon={BedDouble}
          label="حجوزات الإقامة"
          value={data.bookingsTotal}
          sub={`${data.checkedIn} تم تسجيل دخولهم`}
          to="/hotels"
        />
        <Kpi icon={ClipboardList} label="طلبات مفتوحة" value={data.requestsOpen} sub="بحاجة إلى متابعة" to="/speakers" />
        <Kpi icon={AlertTriangle} label="تنبيهات نشطة" value={data.alertsPending} sub="رحلات قريبة" to="/flight-alerts" />
      </div>

      <div className="surface-card space-y-5 p-6">
        <p className="font-display text-lg font-bold text-foreground">نسب الإنجاز</p>
        <ProgressRow label="وصول المتحدثين" done={data.arrived} total={data.arrivalsTotal} />
        <ProgressRow label="تسجيل الدخول للفنادق" done={data.checkedIn} total={data.bookingsTotal} />
        <ProgressRow label="رحلات النقل المنفذة" done={data.tripsTotal - data.tripsActive} total={data.tripsTotal} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-lg font-bold text-foreground">وصول خلال 12 ساعة</p>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/movements">
                الكل <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
          {data.upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا يوجد وصول مجدول قريباً</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.upcoming.map((row: any) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.speakers?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{row.arrival_point ?? "—"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtTime(row.arrival_time)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-lg font-bold text-foreground">تنقلات قادمة</p>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/trips">
                الكل <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
          {data.nextTrips.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">لا توجد تنقلات مجدولة قريباً</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.nextTrips.map((row: any) => (
                <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.speakers?.full_name ?? "رحلة نقل"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.pickup_location ?? "—"} ← {row.dropoff_location ?? "—"}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{fmtTime(row.scheduled_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
