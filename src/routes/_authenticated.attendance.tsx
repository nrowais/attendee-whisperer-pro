import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  { key: "invitee_id", label: "المدعو", type: "ref", ref: { table: "invitees", labelKey: "full_name" } },
  { key: "event_id", label: "الفعالية", type: "ref", ref: { table: "events", labelKey: "name" }, required: true },
  { key: "checked_in_at", label: "وقت التسجيل", type: "datetime" },
  {
    key: "method",
    label: "طريقة التسجيل",
    type: "select",
    badge: true,
    options: [
      { value: "qr", label: "مسح رمز QR" },
      { value: "manual", label: "تسجيل يدوي" },
      { value: "badge", label: "شارة الدخول" },
    ],
  },
];

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور والتسجيل — عمليات ضيوف الفعالية" },
      { name: "description", content: "تسجيل حضور المدعوين عند البوابات ومتابعة سجل التسجيل لحظيًا." },
      { property: "og:title", content: "الحضور والتسجيل — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "تسجيل الحضور ومتابعة سجل الدخول." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <CrudPage
      table="attendance"
      title="الحضور والتسجيل"
      subtitle="تسجيل دخول المدعوين ومتابعة سجل الحضور"
      fields={fields}
    />
  ),
});
