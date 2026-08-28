import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  { key: "full_name", label: "الاسم الكامل", required: true },
  { key: "title", label: "المسمى" },
  { key: "organization", label: "الجهة" },
  { key: "country", label: "الدولة" },
  { key: "email", label: "البريد الإلكتروني" },
  { key: "phone", label: "الجوال" },
  { key: "photo_url", label: "رابط الصورة", list: false },
  { key: "bio", label: "نبذة", type: "textarea", list: false },
];

export const Route = createFileRoute("/_authenticated/speakers")({
  head: () => ({
    meta: [
      { title: "المتحدثون — عمليات ضيوف الفعالية" },
      { name: "description", content: "إدارة بيانات المتحدثين: الإضافة والتعديل والبحث ومتابعة بياناتهم." },
      { property: "og:title", content: "المتحدثون — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "إدارة بيانات المتحدثين وتحديثها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <CrudPage
      table="speakers"
      title="المتحدثون"
      subtitle="إضافة وتعديل بيانات المتحدثين المشاركين في الفعالية"
      fields={fields}
    />
  ),
});
