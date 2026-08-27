import { createFileRoute } from "@tanstack/react-router";
import {
  Plane,
  PlaneLanding,
  BedDouble,
  Car,
  ClipboardCheck,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  speakerKpis,
  guestKpis,
  upcomingArrivals,
  recentActivities,
  type ActivityKind,
  type ArrivalStatus,
} from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — عمليات ضيوف الفعالية" },
      {
        name: "description",
        content: "مؤشرات تشغيلية لحظية للمتحدثين والمدعوين والوصول والنقل والإقامة.",
      },
      { property: "og:title", content: "لوحة التحكم — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "مؤشرات تشغيلية لحظية لعمليات ضيوف الفعالية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const toneClass: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  danger: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

const statusTone: Record<ArrivalStatus, string> = {
  "في الجو": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "هبطت الرحلة": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "في المطار": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "بالطريق": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "في الفندق": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "في موقع الفعالية": "bg-primary/10 text-primary",
  "غادر": "bg-muted text-muted-foreground",
};

const activityIcon: Record<ActivityKind, typeof Plane> = {
  "وصول متحدث": UserCheck,
  "هبوط رحلة": PlaneLanding,
  "وصول الفندق": BedDouble,
  "بدء رحلة سيارة": Car,
  "تنفيذ طلب خاص": ClipboardCheck,
};

function KpiCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-display text-2xl font-bold text-foreground">
            {value.toLocaleString("ar-SA")}
          </span>
          <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${toneClass[tone]}`}>
            محدث
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نظرة تشغيلية شاملة على حركة المتحدثين والمدعوين خلال الفعالية.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">مؤشرات المتحدثين</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {speakerKpis.map((kpi) => (
            <KpiCard key={kpi.key} label={kpi.label} value={kpi.value} tone={kpi.tone} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">مؤشرات دعوات الضيوف</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {guestKpis.map((kpi) => (
            <KpiCard key={kpi.key} label={kpi.label} value={kpi.value} tone={kpi.tone} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">القادمون خلال الساعات القادمة</CardTitle>
            <Badge variant="secondary">{upcomingArrivals.length} قادم</Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">الصورة</TableHead>
                  <TableHead className="text-start">الاسم</TableHead>
                  <TableHead className="text-start">الرحلة</TableHead>
                  <TableHead className="text-start">وقت الوصول</TableHead>
                  <TableHead className="text-start">المطار</TableHead>
                  <TableHead className="text-start">مسؤول الاستقبال</TableHead>
                  <TableHead className="text-start">السائق</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingArrivals.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <img
                        src={row.photo}
                        alt={`صورة ${row.name}`}
                        loading="lazy"
                        className="size-9 rounded-full border border-border object-cover"
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{row.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.flight}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.arrivalTime}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {row.airport}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{row.greeter}</TableCell>
                    <TableCell className="whitespace-nowrap">{row.driver}</TableCell>
                    <TableCell>
                      <span
                        className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${statusTone[row.status]}`}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">آخر التحديثات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((item) => {
              const Icon = activityIcon[item.kind];
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.kind}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
