import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

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

const FLIGHT_KEYS = [
  {
    key: "aerodatabox_api_key",
    title: "AeroDataBox (RapidAPI)",
    hint: "المفتاح المستخدم في مركز الرحلات والاستقبال لتحديث حالات رحلات المتحدثين تلقائيًا.",
  },
  {
    key: "aviationstack_api_key",
    title: "AviationStack",
    hint: "المفتاح المستخدم في شاشة المطار للتحقق من حالة الرحلات المسجلة.",
  },
] as const;

function FlightTrackingSettings() {
  return (
    <div className="space-y-4">
      {FLIGHT_KEYS.map((k) => (
        <FlightKeyCard key={k.key} settingKey={k.key} title={k.title} hint={k.hint} />
      ))}
    </div>
  );
}

function FlightKeyCard({
  settingKey,
  title,
  hint,
}: {
  settingKey: string;
  title: string;
  hint: string;
}) {
  const { isAdmin } = useRoles();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setKey(data.value);
      });
  }, [isAdmin, settingKey]);

  const save = async () => {
    if (!isAdmin) return;
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("app_settings").upsert(
      {
        key: settingKey,
        value: key.trim() || null,
        updated_by: user?.id ?? null,
      },
      { onConflict: "key" },
    );
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "تعذر حفظ المفتاح");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success("تم حفظ المفتاح");
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
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`key-${settingKey}`}>مفتاح API (Access Key)</Label>
          <Input
            id={`key-${settingKey}`}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="ألصق المفتاح هنا"
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
