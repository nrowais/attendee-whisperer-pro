import { createFileRoute } from "@tanstack/react-router";

import { OpsPage, StatusPill, type OpsColumn } from "@/components/portal/OpsPage";
import { staffRows, type StaffRow } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "فريق العمل — عمليات ضيوف الفعالية" },
      { name: "description", content: "أعضاء فريق التشغيل ومواقعهم ومناوباتهم وحالتهم." },
      { property: "og:title", content: "فريق العمل — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "فريق التشغيل والمناوبات والمواقع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

const tone: Record<StaffRow["status"], string> = {
  "متاح": "success",
  "في مهمة": "warning",
  "خارج الدوام": "muted",
};

const columns: OpsColumn<StaffRow>[] = [
  { key: "name", label: "الاسم" },
  { key: "role", label: "الدور" },
  { key: "zone", label: "الموقع" },
  { key: "shift", label: "المناوبة" },
  { key: "phone", label: "الجوال" },
  { key: "status", label: "الحالة", render: (r) => <StatusPill label={r.status} tone={tone[r.status]} /> },
];

function StaffPage() {
  return (
    <OpsPage
      title="فريق العمل"
      subtitle="توزيع فريق التشغيل على المواقع والمناوبات."
      kpis={[
        { label: "إجمالي الفريق", value: 46 },
        { label: "متاح الآن", value: 21 },
        { label: "في مهمة", value: 18 },
        { label: "خارج الدوام", value: 7 },
      ]}
      columns={columns}
      rows={staffRows}
      searchKeys={["name", "role", "zone"]}
      statusKey="status"
      statuses={["متاح", "في مهمة", "خارج الدوام"]}
      actionLabel="إضافة عضو"
    />
  );
}
