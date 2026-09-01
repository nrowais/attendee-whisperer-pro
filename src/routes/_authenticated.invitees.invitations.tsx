import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import { invitationFields, attendanceFields } from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/invitees/invitations")({
  head: () => ({
    meta: [
      { title: "الدعوات والحضور — غرفة العمليات" },
      { name: "description", content: "حالة الدعوات والردود وتسجيل الحضور في الموقع." },
      { property: "og:title", content: "الدعوات والحضور — غرفة العمليات" },
      { property: "og:description", content: "متابعة الدعوات المرسلة والردود والحضور الفعلي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvitationsPage,
});

function InvitationsPage() {
  return (
    <Workspace
      title="الدعوات والحضور"
      subtitle="متابعة إرسال الدعوات والردود عليها وتسجيل الحضور."
      tabs={[
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
          label: "الحضور",
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
