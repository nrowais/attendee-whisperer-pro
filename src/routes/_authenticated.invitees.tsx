import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  { key: "full_name", label: "الاسم الكامل", required: true },
  { key: "organization", label: "الجهة" },
  {
    key: "invitee_type",
    label: "الفئة",
    type: "select",
    badge: true,
    options: [
      { value: "vip", label: "كبار الشخصيات" },
      { value: "official", label: "جهة رسمية" },
      { value: "media", label: "إعلامي" },
      { value: "guest", label: "ضيف" },
      { value: "sponsor", label: "راعٍ" },
    ],
  },
  { key: "email", label: "البريد الإلكتروني" },
  { key: "phone", label: "الجوال" },
];

export const Route = createFileRoute("/_authenticated/invitees")({
  head: () => ({
    meta: [
      { title: "المدعوون — عمليات ضيوف الفعالية" },
      { name: "description", content: "إدارة قائمة المدعوين وفئاتهم وبيانات التواصل معهم." },
      { property: "og:title", content: "المدعوون — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "إدارة قائمة المدعوين وبياناتهم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <CrudPage
      table="invitees"
      title="المدعوون"
      subtitle="إدخال وتحديث بيانات المدعوين وفئاتهم"
      fields={fields}
    />
  ),
});
