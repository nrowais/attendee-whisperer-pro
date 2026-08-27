import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
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
    "key": "speaker_id",
    "label": "المتحدث",
    "type": "ref",
    "ref": {
      "table": "speakers",
      "labelKey": "full_name"
    }
  },
  {
    "key": "flight_id",
    "label": "الرحلة",
    "type": "ref",
    "ref": {
      "table": "flights",
      "labelKey": "flight_number"
    }
  },
  {
    "key": "arrival_time",
    "label": "وقت الوصول",
    "type": "datetime"
  },
  {
    "key": "arrival_point",
    "label": "نقطة الوصول"
  },
  {
    "key": "status",
    "label": "الحالة",
    "type": "select",
    "options": [
      {
        "value": "scheduled",
        "label": "مجدول"
      },
      {
        "value": "arrived",
        "label": "تم الوصول"
      },
      {
        "value": "delayed",
        "label": "متأخر"
      },
      {
        "value": "cancelled",
        "label": "ملغي"
      }
    ],
    "badge": true
  },
  {
    "key": "notes",
    "label": "ملاحظات",
    "type": "textarea",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/arrivals")({
  head: () => ({
    meta: [
      { title: "الوصول — بوابة إدارة الفعاليات" },
      { name: "description", content: "متابعة وصول المتحدثين." },
      { property: "og:title", content: "الوصول — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "متابعة وصول المتحدثين." },
    ],
  }),
  component: () => (
    <CrudPage table="speaker_arrivals" title="الوصول" subtitle="متابعة وصول المتحدثين" fields={fields} />
  ),
});
