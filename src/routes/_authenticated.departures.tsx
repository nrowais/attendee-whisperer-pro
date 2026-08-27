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
    "key": "departure_time",
    "label": "وقت المغادرة",
    "type": "datetime"
  },
  {
    "key": "departure_point",
    "label": "نقطة المغادرة"
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
        "value": "departed",
        "label": "غادر"
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

export const Route = createFileRoute("/_authenticated/departures")({
  head: () => ({
    meta: [
      { title: "المغادرة — بوابة إدارة الفعاليات" },
      { name: "description", content: "متابعة مغادرة المتحدثين." },
      { property: "og:title", content: "المغادرة — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "متابعة مغادرة المتحدثين." },
    ],
  }),
  component: () => (
    <CrudPage table="speaker_departures" title="المغادرة" subtitle="متابعة مغادرة المتحدثين" fields={fields} />
  ),
});
