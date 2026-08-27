import { createFileRoute } from "@tanstack/react-router";

import { OpsPage, StatusPill, type OpsColumn } from "@/components/portal/OpsPage";
import { inviteeRows, type InviteeRow } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/invitees")({
  head: () => ({
    meta: [
      { title: "المدعوون — عمليات ضيوف الفعالية" },
      { name: "description", content: "قائمة المدعوين وحالة ردودهم على الدعوة." },
      { property: "og:title", content: "المدعوون — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "قائمة المدعوين وحالة الردود." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InviteesPage,
});

const tone: Record<InviteeRow["status"], string> = {
  "أكد الحضور": "success",
  "اعتذر": "danger",
  "لم يرد": "muted",
};

const columns: OpsColumn<InviteeRow>[] = [
  { key: "name", label: "الاسم" },
  { key: "org", label: "الجهة" },
  { key: "category", label: "التصنيف" },
  { key: "email", label: "البريد" },
  { key: "phone", label: "الجوال" },
  { key: "status", label: "حالة الدعوة", render: (r) => <StatusPill label={r.status} tone={tone[r.status]} /> },
];

function InviteesPage() {
  return (
    <OpsPage
      title="المدعوون"
      subtitle="متابعة الدعوات وردود الضيوف حتى 1000 مدعو."
      kpis={[
        { label: "إجمالي المدعوين", value: 1000 },
        { label: "أكد الحضور", value: 642 },
        { label: "اعتذر", value: 133 },
        { label: "لم يرد", value: 225 },
      ]}
      columns={columns}
      rows={inviteeRows}
      searchKeys={["name", "org", "email"]}
      statusKey="status"
      statuses={["أكد الحضور", "اعتذر", "لم يرد"]}
      actionLabel="إضافة مدعو"
    />
  );
}
