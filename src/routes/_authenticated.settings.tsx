import { createFileRoute, Link } from "@tanstack/react-router";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { eventName } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — عمليات ضيوف الفعالية" },
      { name: "description", content: "إعدادات الفعالية والتنبيهات والصلاحيات." },
      { property: "og:title", content: "الإعدادات — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "ضبط بيانات الفعالية والتنبيهات والصلاحيات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">ضبط بيانات الفعالية وتفضيلات التشغيل.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">بيانات الفعالية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">اسم الفعالية</Label>
              <Input id="event-name" defaultValue={eventName} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">تاريخ البداية</Label>
                <Input id="start" type="date" defaultValue="2026-11-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">تاريخ النهاية</Label>
                <Input id="end" type="date" defaultValue="2026-11-13" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">الموقع</Label>
              <Input id="venue" defaultValue="مركز الملك عبدالله المالي — الرياض" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">التنبيهات التشغيلية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: "n1", label: "تنبيه عند هبوط رحلة متحدث", on: true },
              { id: "n2", label: "تنبيه عند تأخر السائق عن موعد الاستلام", on: true },
              { id: "n3", label: "تنبيه عند تسجيل دخول الفندق", on: false },
              { id: "n4", label: "ملخص يومي بالبريد الإلكتروني", on: true },
            ].map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-4">
                <Label htmlFor={n.id} className="text-sm font-normal">
                  {n.label}
                </Label>
                <Switch id={n.id} defaultChecked={n.on} />
              </div>
            ))}
            <Separator />
            <p className="text-sm text-muted-foreground">
              لإدارة المستخدمين والصلاحيات انتقل إلى{" "}
              <Link to="/users" className="font-medium text-primary underline-offset-4 hover:underline">
                المستخدمون والصلاحيات
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
