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
    "key": "driver_id",
    "label": "السائق",
    "type": "ref",
    "ref": {
      "table": "drivers",
      "labelKey": "full_name"
    }
  },
  {
    "key": "vehicle_id",
    "label": "المركبة",
    "type": "ref",
    "ref": {
      "table": "vehicles",
      "labelKey": "plate_number"
    },
    "list": false
  },
  {
    "key": "trip_type",
    "label": "نوع الرحلة",
    "type": "select",
    "options": [
      {
        "value": "transfer",
        "label": "نقل"
      },
      {
        "value": "pickup",
        "label": "استقبال"
      },
      {
        "value": "dropoff",
        "label": "توصيل"
      }
    ],
    "list": false
  },
  {
    "key": "pickup_location",
    "label": "نقطة الانطلاق",
    "list": false
  },
  {
    "key": "dropoff_location",
    "label": "الوجهة",
    "list": false
  },
  {
    "key": "scheduled_at",
    "label": "الموعد",
    "type": "datetime"
  },
  {
    "key": "status",
    "label": "الحالة",
    "type": "select",
    "options": [
      {
        "value": "scheduled",
        "label": "مجدولة"
      },
      {
        "value": "ongoing",
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
    "key": "notes",
    "label": "ملاحظات",
    "type": "textarea",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({
    meta: [
      { title: "رحلات النقل — بوابة إدارة الفعاليات" },
      { name: "description", content: "تنظيم التنقلات الأرضية." },
      { property: "og:title", content: "رحلات النقل — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "تنظيم التنقلات الأرضية." },
    ],
  }),
  component: () => (
    <CrudPage table="transport_trips" title="رحلات النقل" subtitle="تنظيم التنقلات الأرضية" fields={fields} />
  ),
});
