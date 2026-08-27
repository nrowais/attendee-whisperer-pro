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
    "key": "invitee_id",
    "label": "المدعو",
    "type": "ref",
    "ref": {
      "table": "invitees",
      "labelKey": "full_name"
    }
  },
  {
    "key": "checked_in_at",
    "label": "وقت التسجيل",
    "type": "datetime"
  },
  {
    "key": "method",
    "label": "طريقة التسجيل",
    "type": "select",
    "options": [
      {
        "value": "manual",
        "label": "يدوي"
      },
      {
        "value": "qr",
        "label": "رمز QR"
      },
      {
        "value": "badge",
        "label": "بطاقة"
      }
    ],
    "badge": true
  }
];

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "الحضور — بوابة إدارة الفعاليات" },
      { name: "description", content: "تسجيل حضور المدعوين." },
      { property: "og:title", content: "الحضور — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "تسجيل حضور المدعوين." },
    ],
  }),
  component: () => (
    <CrudPage table="attendance" title="الحضور" subtitle="تسجيل حضور المدعوين" fields={fields} />
  ),
});
