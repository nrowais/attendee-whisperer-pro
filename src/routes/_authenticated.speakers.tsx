import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "full_name",
    "label": "الاسم الكامل"
  },
  {
    "key": "title",
    "label": "المسمى الوظيفي"
  },
  {
    "key": "organization",
    "label": "الجهة"
  },
  {
    "key": "country",
    "label": "الدولة"
  },
  {
    "key": "email",
    "label": "البريد"
  },
  {
    "key": "phone",
    "label": "الجوال"
  },
  {
    "key": "photo_url",
    "label": "رابط الصورة",
    "list": false
  },
  {
    "key": "bio",
    "label": "نبذة",
    "type": "textarea",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/speakers")({
  head: () => ({
    meta: [
      { title: "المتحدثون — بوابة إدارة الفعاليات" },
      { name: "description", content: "سجل المتحدثين وبياناتهم." },
      { property: "og:title", content: "المتحدثون — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "سجل المتحدثين وبياناتهم." },
    ],
  }),
  component: () => (
    <CrudPage table="speakers" title="المتحدثون" subtitle="سجل المتحدثين وبياناتهم" fields={fields} />
  ),
});
