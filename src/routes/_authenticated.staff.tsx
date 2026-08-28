import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  { key: "full_name", label: "الاسم الكامل", required: true },
  { key: "job_title", label: "المسمى الوظيفي" },
  { key: "department", label: "الإدارة / الموقع" },
  { key: "phone", label: "الجوال" },
  { key: "email", label: "البريد الإلكتروني" },
];

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "فريق العمل — عمليات ضيوف الفعالية" },
      { name: "description", content: "إدارة أعضاء فريق التشغيل ومواقعهم وبيانات التواصل معهم." },
      { property: "og:title", content: "فريق العمل — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "إدارة أعضاء فريق التشغيل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <CrudPage
      table="staff"
      title="فريق العمل"
      subtitle="إضافة وتحديث بيانات فريق التشغيل"
      fields={fields}
    />
  ),
});
