import { createFileRoute } from "@tanstack/react-router";

import { OpsPage, StatusPill, type OpsColumn } from "@/components/portal/OpsPage";
import { requestRows, type RequestRow } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "الطلبات الخاصة — عمليات ضيوف الفعالية" },
      { name: "description", content: "متابعة طلبات الضيوف الخاصة وحالة تنفيذها." },
      { property: "og:title", content: "الطلبات الخاصة — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "طلبات الضيوف الخاصة وحالة التنفيذ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

const tone: Record<RequestRow["status"], string> = {
  "جديد": "info",
  "قيد التنفيذ": "warning",
  "منفذ": "success",
  "مرفوض": "danger",
};

const priorityTone: Record<RequestRow["priority"], string> = {
  "عالية": "danger",
  "متوسطة": "warning",
  "منخفضة": "muted",
};

const columns: OpsColumn<RequestRow>[] = [
  { key: "guest", label: "الضيف" },
  { key: "category", label: "التصنيف" },
  { key: "detail", label: "التفاصيل", render: (r) => <span className="whitespace-normal">{r.detail}</span> },
  { key: "priority", label: "الأولوية", render: (r) => <StatusPill label={r.priority} tone={priorityTone[r.priority]} /> },
  { key: "owner", label: "المسؤول" },
  { key: "status", label: "الحالة", render: (r) => <StatusPill label={r.status} tone={tone[r.status]} /> },
];

function RequestsPage() {
  return (
    <OpsPage
      title="الطلبات الخاصة"
      subtitle="طلبات الضيوف والمتحدثين ومتابعة تنفيذها حتى الإغلاق."
      kpis={[
        { label: "إجمالي الطلبات", value: 87 },
        { label: "جديدة", value: 12 },
        { label: "قيد التنفيذ", value: 19 },
        { label: "منفذة", value: 51 },
      ]}
      columns={columns}
      rows={requestRows}
      searchKeys={["guest", "category", "detail", "owner"]}
      statusKey="status"
      statuses={["جديد", "قيد التنفيذ", "منفذ", "مرفوض"]}
      actionLabel="طلب جديد"
    />
  );
}
