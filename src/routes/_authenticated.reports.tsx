import { createFileRoute } from "@tanstack/react-router";
import { FileBarChart, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير — عمليات ضيوف الفعالية" },
      { name: "description", content: "تقارير تشغيلية عن الحضور والوصول والنقل والإقامة." },
      { property: "og:title", content: "التقارير — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "تقارير تشغيلية جاهزة للتصدير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const reports = [
  { title: "تقرير وصول المتحدثين", desc: "حالة وصول 180 متحدثاً حسب الرحلة والمطار.", period: "يومي" },
  { title: "تقرير تأكيدات المدعوين", desc: "نِسب التأكيد والاعتذار وعدم الرد لـ 1000 مدعو.", period: "أسبوعي" },
  { title: "تقرير الإقامة الفندقية", desc: "إشغال الغرف وتوزيع الضيوف على الفنادق.", period: "يومي" },
  { title: "تقرير النقل والسيارات", desc: "عدد الرحلات، السائقين النشطين، ومتوسط زمن التنقل.", period: "يومي" },
  { title: "تقرير الطلبات الخاصة", desc: "الطلبات المفتوحة والمنفذة حسب التصنيف.", period: "لحظي" },
  { title: "تقرير الحضور والتسجيل", desc: "أعداد المسجلين فعلياً في موقع الفعالية.", period: "لحظي" },
];

function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">التقارير</h1>
        <p className="mt-1 text-sm text-muted-foreground">تقارير جاهزة يمكن تصديرها ومشاركتها مع الإدارة.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => (
          <Card key={r.title} className="flex flex-col">
            <CardHeader className="flex-row items-start gap-3 space-y-0">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileBarChart className="size-5" />
              </span>
              <div>
                <CardTitle className="text-base">{r.title}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">{r.period}</p>
              </div>
            </CardHeader>
            <CardContent className="mt-auto space-y-4">
              <p className="text-sm text-muted-foreground">{r.desc}</p>
              <Button variant="outline" size="sm" className="w-full">
                <Download className="size-4" />
                تصدير
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
