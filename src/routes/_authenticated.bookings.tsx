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
    "key": "hotel_id",
    "label": "الفندق",
    "type": "ref",
    "ref": {
      "table": "hotels",
      "labelKey": "name"
    }
  },
  {
    "key": "room_id",
    "label": "الغرفة",
    "type": "ref",
    "ref": {
      "table": "hotel_rooms",
      "labelKey": "room_number"
    },
    "list": false
  },
  {
    "key": "check_in",
    "label": "تاريخ الدخول",
    "type": "date"
  },
  {
    "key": "check_out",
    "label": "تاريخ الخروج",
    "type": "date"
  },
  {
    "key": "status",
    "label": "الحالة",
    "type": "select",
    "options": [
      {
        "value": "reserved",
        "label": "محجوز"
      },
      {
        "value": "confirmed",
        "label": "مؤكد"
      },
      {
        "value": "checked_in",
        "label": "تم الدخول"
      },
      {
        "value": "checked_out",
        "label": "تم الخروج"
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

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "حجوزات الفنادق — بوابة إدارة الفعاليات" },
      { name: "description", content: "حجوزات إقامة المتحدثين." },
      { property: "og:title", content: "حجوزات الفنادق — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "حجوزات إقامة المتحدثين." },
    ],
  }),
  component: () => (
    <CrudPage table="hotel_bookings" title="حجوزات الفنادق" subtitle="حجوزات إقامة المتحدثين" fields={fields} />
  ),
});
