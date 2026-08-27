import { createFileRoute } from "@tanstack/react-router";

import { OpsPage, StatusPill, type OpsColumn } from "@/components/portal/OpsPage";
import { attendanceRows, type AttendanceRow } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والتسجيل — عمليات ضيوف الفعالية" },
      { name: "description", content: "تسجيل الحضور عند البوابات ومتابعة الشارات." },
      { property: "og:title", content: "الحضور والتسجيل — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "تسجيل الحضور عند بوابات الفعالية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AttendancePage,
});

const tone: Record<AttendanceRow["status"], string> = {
  "حضر": "success",
  "لم يسجل": "muted",
};

const columns: OpsColumn<AttendanceRow>[] = [
  { key: "name", label: "الاسم" },
  { key: "type", label: "الفئة" },
  { key: "badge", label: "رقم الشارة" },
  { key: "gate", label: "البوابة" },
  { key: "checkIn", label: "وقت التسجيل" },
  { key: "status", label: "الحالة", render: (r) => <StatusPill label={r.status} tone={tone[r.status]} /> },
];

function AttendancePage() {
  return (
    <OpsPage
      title="الحضور والتسجيل"
      subtitle="متابعة تسجيل الدخول عند بوابات موقع الفعالية."
      kpis={[
        { label: "إجمالي المسجلين", value: 498 },
        { label: "البوابة الرئيسية", value: 331 },
        { label: "كبار الشخصيات", value: 96 },
        { label: "بوابة الإعلام", value: 71 },
      ]}
      columns={columns}
      rows={attendanceRows}
      searchKeys={["name", "badge"]}
      statusKey="status"
      statuses={["حضر", "لم يسجل"]}
      actionLabel="تسجيل حضور"
    />
  );
}
