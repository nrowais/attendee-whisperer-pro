import { createFileRoute } from "@tanstack/react-router";
import { PlaneLanding, PlaneTakeoff, Users, Clock } from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/airport")({
  head: () => ({
    meta: [
      { title: "المطار — عمليات ضيوف الفعالية" },
      { name: "description", content: "متابعة عمليات الاستقبال والتوديع في المطار لحظة بلحظة." },
      { property: "og:title", content: "المطار — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "عمليات الاستقبال والتوديع في المطار." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AirportPage,
});

const stats = [
  { label: "رحلات وصول اليوم", value: 14, icon: PlaneLanding },
  { label: "رحلات مغادرة اليوم", value: 6, icon: PlaneTakeoff },
  { label: "ضيوف في صالة الاستقبال", value: 9, icon: Users },
  { label: "متوسط زمن الاستقبال", value: "18 د", icon: Clock },
];

const desks = [
  { flight: "SV 1042", terminal: "الصالة 5", counter: "بوابة A3", officer: "نورة العتيبي", guests: 3, status: "جاهز" },
  { flight: "EK 819", terminal: "الصالة 4", counter: "بوابة B1", officer: "عبدالله القحطاني", guests: 2, status: "قيد الاستقبال" },
  { flight: "LH 630", terminal: "الصالة 4", counter: "بوابة B7", officer: "ريم الحربي", guests: 1, status: "اكتمل" },
  { flight: "QR 1128", terminal: "الصالة 3", counter: "بوابة C2", officer: "منى الصالح", guests: 4, status: "جاهز" },
];

function AirportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">المطار</h1>
        <p className="mt-1 text-sm text-muted-foreground">مراكز الاستقبال والتوديع وحالة كل رحلة.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="font-display text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مراكز الاستقبال</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">الرحلة</TableHead>
                <TableHead className="text-start">الصالة</TableHead>
                <TableHead className="text-start">نقطة اللقاء</TableHead>
                <TableHead className="text-start">مسؤول الاستقبال</TableHead>
                <TableHead className="text-start">عدد الضيوف</TableHead>
                <TableHead className="text-start">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {desks.map((d) => (
                <TableRow key={d.flight}>
                  <TableCell className="font-medium">{d.flight}</TableCell>
                  <TableCell>{d.terminal}</TableCell>
                  <TableCell>{d.counter}</TableCell>
                  <TableCell>{d.officer}</TableCell>
                  <TableCell>{d.guests}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{d.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
