import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير — بوابة إدارة الفعالية" },
      { name: "description", content: "تقارير تشغيلية بأرقام حقيقية قابلة للتصدير بصيغة CSV." },
      { property: "og:title", content: "التقارير — بوابة إدارة الفعالية" },
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
    select: "arrival_time, arrival_point, status",
    columns: [
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
    select: "trip_type, pickup_location, dropoff_location, scheduled_at, status",
    columns: [
      { key: "trip_type", label: "النوع" },
      { key: "pickup_location", label: "من" },
      { key: "dropoff_location", label: "إلى" },
      { key: "status", label: "الحالة" },
    ],
  },
  {
    key: "bookings",
    title: "تقرير الإقامة",
    desc: "حجوزات الفنادق وتواريخ الدخول والخروج.",
    table: "hotel_bookings",
    select: "check_in, check_out, status, notes",
    columns: [
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
    select: "checked_in_at, method",
    columns: [
      { key: "checked_in_at", label: "وقت التسجيل" },
      { key: "method", label: "الطريقة" },
    ],
  },
  {
    key: "requests",
    title: "تقرير الطلبات الخاصة",
    desc: "الطلبات وحالتها وأولويتها.",
    table: "speaker_requests",
    select: "title, priority, status, details",
    columns: [
      { key: "title", label: "الطلب" },
      { key: "priority", label: "الأولوية" },
      { key: "status", label: "الحالة" },
    ],
  },
];

function toCsv(rows: Record<string, any>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function ReportCard({ report }: { report: ReportDef }) {
  const query = useQuery({
    queryKey: ["report", report.key],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await db.from(report.table).select(report.select).limit(1000);
      if (error) throw error;
      return (data ?? []) as Record<string, any>[];
    },
  });

  const rows = query.data ?? [];

  function download() {
    const csv = toCsv(rows);
    if (!csv) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تصدير التقرير");
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

      <Button variant="outline" onClick={download} className="mt-auto w-full">
        <Download className="size-4" />
        تصدير CSV
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
          أرقام حقيقية من قاعدة البيانات مع إمكانية التصدير إلى ملف Excel/CSV.
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
