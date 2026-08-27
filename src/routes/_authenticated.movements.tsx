import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/movements")({
  head: () => ({
    meta: [
      { title: "الوصول والمغادرة — عمليات ضيوف الفعالية" },
      { name: "description", content: "متابعة جداول وصول ومغادرة المتحدثين والضيوف." },
      { property: "og:title", content: "الوصول والمغادرة — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "جداول وصول ومغادرة الضيوف والمتحدثين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MovementsPage,
});

const arrivals = [
  { name: "د. سلطان الغامدي", flight: "SV 1042", time: "اليوم 14:35", from: "جدة", status: "في الجو" },
  { name: "أ. ليلى المنصور", flight: "EK 819", time: "اليوم 15:10", from: "دبي", status: "هبطت" },
  { name: "Prof. Daniel Reyes", flight: "LH 630", time: "اليوم 16:05", from: "فرانكفورت", status: "في المطار" },
  { name: "د. هند الزهراني", flight: "MS 671", time: "اليوم 17:20", from: "القاهرة", status: "بالطريق" },
];

const departures = [
  { name: "م. عمر الخليفة", flight: "SV 553", time: "غداً 09:15", to: "الدمام", status: "مؤكدة" },
  { name: "Dr. Sofia Bianchi", flight: "TK 145", time: "غداً 12:40", to: "إسطنبول", status: "بانتظار التأكيد" },
  { name: "أ. مشاري العتيبي", flight: "XY 220", time: "بعد غد 08:00", to: "أبها", status: "مؤكدة" },
];

function MovementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">الوصول والمغادرة</h1>
          <p className="mt-1 text-sm text-muted-foreground">جداول تشغيلية لحركة الضيوف من وإلى المدينة.</p>
        </div>
        <Input className="w-full sm:w-64" placeholder="بحث بالاسم أو رقم الرحلة" aria-label="بحث" />
      </div>

      <Tabs defaultValue="arrivals">
        <TabsList>
          <TabsTrigger value="arrivals">الوصول</TabsTrigger>
          <TabsTrigger value="departures">المغادرة</TabsTrigger>
        </TabsList>

        <TabsContent value="arrivals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">رحلات الوصول</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">الاسم</TableHead>
                    <TableHead className="text-start">الرحلة</TableHead>
                    <TableHead className="text-start">الوقت</TableHead>
                    <TableHead className="text-start">قادم من</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrivals.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.flight}</TableCell>
                      <TableCell>{r.time}</TableCell>
                      <TableCell>{r.from}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departures">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">رحلات المغادرة</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">الاسم</TableHead>
                    <TableHead className="text-start">الرحلة</TableHead>
                    <TableHead className="text-start">الوقت</TableHead>
                    <TableHead className="text-start">الوجهة</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departures.map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.flight}</TableCell>
                      <TableCell>{r.time}</TableCell>
                      <TableCell>{r.to}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
