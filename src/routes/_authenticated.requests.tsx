import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  { key: "title", label: "عنوان الطلب", required: true },
  { key: "speaker_id", label: "المتحدث", type: "ref", ref: { table: "speakers", labelKey: "full_name" } },
  { key: "event_id", label: "الفعالية", type: "ref", ref: { table: "events", labelKey: "name" } },
  { key: "category_id", label: "التصنيف", type: "ref", ref: { table: "request_categories", labelKey: "name" } },
  {
    key: "priority",
    label: "الأولوية",
    type: "select",
    badge: true,
    options: [
      { value: "high", label: "عالية" },
      { value: "medium", label: "متوسطة" },
      { value: "low", label: "منخفضة" },
    ],
  },
  {
    key: "status",
    label: "الحالة",
    type: "select",
    badge: true,
    options: [
      { value: "new", label: "جديد" },
      { value: "in_progress", label: "قيد التنفيذ" },
      { value: "done", label: "منفذ" },
      { value: "rejected", label: "مرفوض" },
    ],
  },
  { key: "details", label: "التفاصيل", type: "textarea", list: false },
];

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "الطلبات الخاصة — عمليات ضيوف الفعالية" },
      { name: "description", content: "استقبال طلبات الضيوف الخاصة وتحديث أولويتها وحالة تنفيذها." },
      { property: "og:title", content: "الطلبات الخاصة — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "إدارة طلبات الضيوف وحالة التنفيذ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <CrudPage
      table="speaker_requests"
      title="الطلبات الخاصة"
      subtitle="تسجيل الطلبات ومتابعة حالتها حتى الإغلاق"
      fields={fields}
    />
  ),
});
