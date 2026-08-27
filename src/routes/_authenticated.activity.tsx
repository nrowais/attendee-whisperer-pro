import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { activityLog } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "سجل النشاط — عمليات ضيوف الفعالية" },
      { name: "description", content: "سجل زمني لكل التحديثات التشغيلية: الرحلات، الوصول، النقل، والطلبات الخاصة." },
      { property: "og:title", content: "سجل النشاط — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "تتبّع كل التحديثات التشغيلية لحظة بلحظة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

export function stateVariant(state: string) {
  if (state === "تنبيه") return "destructive" as const;
  if (state === "قيد التنفيذ") return "secondary" as const;
  return "default" as const;
}

function ActivityPage() {
  const [q, setQ] = useState("");
  const rows = activityLog.filter((r) =>
    [r.kind, r.detail, r.actor, r.state].some((v) => v.toLowerCase().includes(q.trim().toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <History className="size-5 text-primary" />
            سجل النشاط
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">كل التحديثات التشغيلية مرتّبة من الأحدث إلى الأقدم.</p>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث في السجل…"
          className="w-full sm:w-72"
          aria-label="بحث في سجل النشاط"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">النوع</TableHead>
                <TableHead className="text-start">التفاصيل</TableHead>
                <TableHead className="text-start">المسؤول</TableHead>
                <TableHead className="text-start">الوقت</TableHead>
                <TableHead className="text-start">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap font-medium">{r.kind}</TableCell>
                  <TableCell className="text-muted-foreground">{r.detail}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.actor}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{r.time}</TableCell>
                  <TableCell>
                    <Badge variant={stateVariant(r.state)}>{r.state}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    لا توجد نتائج مطابقة.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
