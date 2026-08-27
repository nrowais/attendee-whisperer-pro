import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "name",
    "label": "اسم الفعالية"
  },
  {
    "key": "city",
    "label": "المدينة"
  },
  {
    "key": "venue",
    "label": "المقر"
  },
  {
    "key": "start_date",
    "label": "تاريخ البداية",
    "type": "date"
  },
  {
    "key": "end_date",
    "label": "تاريخ النهاية",
    "type": "date"
  },
  {
    "key": "status",
    "label": "الحالة",
    "type": "select",
    "options": [
      {
        "value": "planned",
        "label": "مخطط لها"
      },
      {
        "value": "active",
        "label": "جارية"
      },
      {
        "value": "completed",
        "label": "منتهية"
      },
      {
        "value": "cancelled",
        "label": "ملغاة"
      }
    ],
    "badge": true
  },
  {
    "key": "description",
    "label": "الوصف",
    "type": "textarea",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({
    meta: [
      { title: "الفعاليات — بوابة إدارة الفعاليات" },
      { name: "description", content: "إدارة بيانات الفعاليات ومواعيدها ومواقعها." },
      { property: "og:title", content: "الفعاليات — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "إدارة بيانات الفعاليات ومواعيدها ومواقعها." },
    ],
  }),
  component: () => (
    <CrudPage table="events" title="الفعاليات" subtitle="إدارة بيانات الفعاليات ومواعيدها ومواقعها" fields={fields} />
  ),
});
