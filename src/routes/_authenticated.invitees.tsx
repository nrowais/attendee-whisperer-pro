import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "full_name",
    "label": "الاسم الكامل"
  },
  {
    "key": "organization",
    "label": "الجهة"
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
    "key": "invitee_type",
    "label": "نوع المدعو",
    "type": "select",
    "options": [
      {
        "value": "guest",
        "label": "ضيف"
      },
      {
        "value": "vip",
        "label": "شخصية مهمة"
      },
      {
        "value": "media",
        "label": "إعلام"
      },
      {
        "value": "partner",
        "label": "شريك"
      }
    ],
    "badge": true
  }
];

export const Route = createFileRoute("/_authenticated/invitees")({
  head: () => ({
    meta: [
      { title: "المدعوون — بوابة إدارة الفعاليات" },
      { name: "description", content: "قاعدة بيانات المدعوين." },
      { property: "og:title", content: "المدعوون — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "قاعدة بيانات المدعوين." },
    ],
  }),
  component: () => (
    <CrudPage table="invitees" title="المدعوون" subtitle="قاعدة بيانات المدعوين" fields={fields} />
  ),
});
