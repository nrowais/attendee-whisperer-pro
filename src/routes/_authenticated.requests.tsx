import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "title",
    "label": "عنوان الطلب"
  },
  {
    "key": "speaker_id",
    "label": "المتحدث",
    "type": "ref",
    "ref": {
      "table": "speakers",
      "labelKey": "full_name"
    }
  },
  {
    "key": "event_id",
    "label": "الفعالية",
    "type": "ref",
    "ref": {
      "table": "events",
      "labelKey": "name"
    }
  },
  {
    "key": "category_id",
    "label": "التصنيف",
    "type": "ref",
    "ref": {
      "table": "request_categories",
      "labelKey": "name"
    }
  },
  {
    "key": "priority",
    "label": "الأولوية",
    "type": "select",
    "options": [
      {
        "value": "low",
        "label": "منخفضة"
      },
      {
        "value": "normal",
        "label": "عادية"
      },
      {
        "value": "high",
        "label": "عاجلة"
      }
    ],
    "badge": true
  },
  {
    "key": "status",
    "label": "الحالة",
    "type": "select",
    "options": [
      {
        "value": "open",
        "label": "مفتوح"
      },
      {
        "value": "in_progress",
        "label": "قيد التنفيذ"
      },
      {
        "value": "done",
        "label": "منجز"
      },
      {
        "value": "rejected",
        "label": "مرفوض"
      }
    ],
    "badge": true
  },
  {
    "key": "details",
    "label": "التفاصيل",
    "type": "textarea",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({
    meta: [
      { title: "طلبات المتحدثين — بوابة إدارة الفعاليات" },
      { name: "description", content: "استقبال ومتابعة الطلبات." },
      { property: "og:title", content: "طلبات المتحدثين — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "استقبال ومتابعة الطلبات." },
    ],
  }),
  component: () => (
    <CrudPage table="speaker_requests" title="طلبات المتحدثين" subtitle="استقبال ومتابعة الطلبات" fields={fields} />
  ),
});
