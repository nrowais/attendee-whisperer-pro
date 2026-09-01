import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Workspace } from "@/components/portal/Workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSheetsSyncToken } from "@/lib/sheetsSync.functions";

const TABLES: Array<{ table: string; label: string }> = [
  { table: "speakers", label: "المتحدثون" },
  { table: "invitees", label: "الضيوف والمدعوون" },
  { table: "invitations", label: "الدعوات" },
  { table: "attendance", label: "الحضور" },
  { table: "speaker_sessions", label: "الجلسات" },
  { table: "speaker_requests", label: "الطلبات الخاصة" },
  { table: "flights", label: "رحلات الطيران" },
  { table: "speaker_arrivals", label: "الوصول" },
  { table: "speaker_departures", label: "المغادرة" },
  { table: "guest_operations", label: "الحالة التشغيلية" },
  { table: "transport_trips", label: "رحلات النقل" },
  { table: "driver_cards", label: "بطاقات السائقين" },
  { table: "drivers", label: "السائقون" },
  { table: "vehicles", label: "المركبات" },
  { table: "hotels", label: "الفنادق" },
  { table: "hotel_rooms", label: "الغرف" },
  { table: "hotel_bookings", label: "الحجوزات الفندقية" },
  { table: "staff", label: "فريق العمل" },
  { table: "staff_assignments", label: "توزيع الفريق" },
  { table: "events", label: "الفعاليات" },
];

export const Route = createFileRoute("/_authenticated/sheets")({
  head: () => ({
    meta: [
      { title: "المزامنة مع Google Sheets — حوار الأمن والتاريخ" },
      {
        name: "description",
        content: "ربط قاعدة بيانات البوابة بجداول Google Sheets ومزامنة البيانات تلقائيًا.",
      },
      { property: "og:title", content: "المزامنة مع Google Sheets" },
      { property: "og:description", content: "مزامنة تلقائية لبيانات المؤتمر مع Google Sheets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SheetsSyncPage,
});

function SheetsSyncPage() {
  const fetchToken = useServerFn(getSheetsSyncToken);
  const { data, isLoading, error } = useQuery({
    queryKey: ["sheets-sync-token"],
    queryFn: () => fetchToken(),
    staleTime: Infinity,
  });
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const formulaFor = (table: string) =>
    `=IMPORTDATA("${origin}/api/public/sheets/${table}?token=${data?.token ?? ""}")`;

  const copy = async (table: string) => {
    await navigator.clipboard.writeText(formulaFor(table));
    setCopied(table);
    toast.success("تم نسخ الصيغة — الصقها في خلية A1 داخل Google Sheets");
    setTimeout(() => setCopied((c) => (c === table ? null : c)), 2000);
  };

  return (
    <Workspace
      title="المزامنة مع Google Sheets"
      subtitle="اربط أي جدول من قاعدة البيانات بورقة في Google Sheets وسيتحدّث تلقائيًا مع كل بيانات جديدة."
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">طريقة الربط (٣ خطوات)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-7 text-muted-foreground">
          <p>١. افتح ملف Google Sheets جديدًا وأنشئ ورقة لكل جدول تريد مزامنته.</p>
          <p>٢. انسخ الصيغة المقابلة من القائمة أدناه والصقها في الخلية <strong>A1</strong> في تلك الورقة.</p>
          <p>
            ٣. ستظهر البيانات فورًا، ويقوم Google بتحديثها تلقائيًا بشكل دوري. لتحديث فوري:
            القائمة <strong>البيانات ← تحديث الكل</strong>.
          </p>
          <p className="text-xs">
            المزامنة في اتجاه واحد: من البوابة إلى الشيت. أي إضافة أو تعديل داخل البرنامج تظهر في الشيت،
            بينما التعديل داخل الشيت لا يؤثر على قاعدة البيانات.
          </p>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" /> جارٍ تجهيز روابط المزامنة…
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "تعذّر جلب روابط المزامنة"}
        </p>
      )}

      {data && (
        <div className="grid gap-3 md:grid-cols-2">
          {TABLES.map(({ table, label }) => (
            <div
              key={table}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="font-medium">{label}</p>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">
                  /api/public/sheets/{table}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => copy(table)}>
                {copied === table ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                <span className="ms-1">نسخ الصيغة</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        تنبيه أمني: الصيغة تحتوي على مفتاح وصول سري — لا تشارك ملف الشيت إلا مع فريق العمل الموثوق.
      </p>
    </Workspace>
  );
}
