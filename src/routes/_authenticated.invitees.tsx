import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import { inviteeFields, invitationFields, attendanceFields } from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/invitees")({
  head: () => ({
    meta: [
      { title: "المدعوون والحضور — بوابة إدارة الفعالية" },
      { name: "description", content: "إدارة المدعوين والدعوات وتسجيل الحضور في شاشة واحدة." },
      { property: "og:title", content: "المدعوون والحضور — بوابة إدارة الفعالية" },
      { property: "og:description", content: "المدعوون والدعوات وتسجيل الحضور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InviteesWorkspace,
});

function InviteesWorkspace() {
  return (
    <Workspace
      title="المدعوون والحضور"
      subtitle="سجّل المدعوين، أرسل الدعوات، وتابع تسجيل الحضور."
      tabs={[
        {
          value: "invitees",
          label: "المدعوون",
          content: (
            <CrudPage
              compact
              table="invitees"
              title="المدعوون"
              subtitle="قائمة المدعوين"
              fields={inviteeFields}
            />
          ),
        },
        {
          value: "invitations",
          label: "الدعوات",
          content: (
            <CrudPage
              compact
              table="invitations"
              title="الدعوات"
              subtitle="حالة الدعوات والردود"
              fields={invitationFields}
            />
          ),
        },
        {
          value: "attendance",
          label: "الحضور والتسجيل",
          content: (
            <CrudPage
              compact
              table="attendance"
              title="الحضور"
              subtitle="تسجيل الحضور في الموقع"
              fields={attendanceFields}
            />
          ),
        },
      ]}
    />
  );
}
