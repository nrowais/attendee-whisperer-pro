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
      ]}
    />
  );
}
