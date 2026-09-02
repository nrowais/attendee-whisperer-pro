import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useRoles } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  eventFields,
  staffFields,
  assignmentFields,
  categoryFields,
} from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — حوار الأمن والتاريخ" },
      { name: "description", content: "إعدادات الفعالية وفريق العمل والتصنيفات والصلاحيات." },
      { property: "og:title", content: "الإعدادات — حوار الأمن والتاريخ" },
      { property: "og:description", content: "الفعالية وفريق العمل والصلاحيات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsWorkspace,
});

function FlightTrackingSettings() {
  const { isAdmin } = useRoles();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "aviationstack_api_key")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setKey(data.value);
      });
  }, [isAdmin]);

  const save = async () => {
    if (!isAdmin) return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings").upsert(
      {
        key: "aviationstack_api_key",
        value: key.trim(),
        updated_by: user?.id,
      },
      { onConflict: "key" },
    );
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "تعذر حفظ المفتاح");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("تم حفظ مفتاح AviationStack");
    }
  };

  if (!isAdmin) {
    return (
      <p className="text-sm text-muted-foreground">
        هذا القسم متاح للمدير فقط.
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold">متابعة الرحلات الجوية</h3>
          <p className="text-sm text-muted-foreground">
            أدخل مفتاح AviationStack لتمكين التحقق المباشر من حالة الرحلات والتأخيرات.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="aviation-key">مفتاح API (Access Key)</Label>
          <Input
            id="aviation-key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ألصق مفتاح AviationStack هنا"
            dir="ltr"
          />
        </div>
        <Button onClick={save} disabled={loading}>
          {loading ? "جارٍ الحفظ…" : saved ? "تم الحفظ" : "حفظ المفتاح"}
        </Button>
      </CardContent>
    </Card>
  );
}

function SettingsWorkspace() {
  return (
    <Workspace
      title="الإعدادات"
      subtitle="بيانات الفعالية وفريق العمل والتصنيفات وصلاحيات المستخدمين."
      aside={
        <Button variant="outline" asChild>
          <Link to="/users">المستخدمون والصلاحيات</Link>
        </Button>
      }
      tabs={[
        {
          value: "events",
          label: "الفعاليات",
          content: (
            <CrudPage
              compact
              table="events"
              title="الفعاليات"
              subtitle="بيانات الفعالية ومواعيدها"
              fields={eventFields}
            />
          ),
        },
        {
          value: "staff",
          label: "فريق العمل",
          content: (
            <CrudPage
              compact
              table="staff"
              title="فريق العمل"
              subtitle="أعضاء الفريق المنظّم"
              fields={staffFields}
            />
          ),
        },
        {
          value: "assignments",
          label: "مهام الفريق",
          content: (
            <CrudPage
              compact
              table="staff_assignments"
              title="مهام الفريق"
              subtitle="توزيع المهام والورديات"
              fields={assignmentFields}
            />
          ),
        },
        {
          value: "categories",
          label: "تصنيفات الطلبات",
          content: (
            <CrudPage
              compact
              table="request_categories"
              title="تصنيفات الطلبات"
              subtitle="تصنيف الطلبات الخاصة"
              fields={categoryFields}
            />
          ),
        },
        {
          value: "flight-tracking",
          label: "متابعة الرحلات",
          content: <FlightTrackingSettings />,
        },
      ]}
    />
  );
}
