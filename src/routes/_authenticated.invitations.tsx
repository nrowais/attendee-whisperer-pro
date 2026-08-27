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
    "key": "status",
    "label": "الحالة",
    "type": "select",
    "options": [
      {
        "value": "pending",
        "label": "بانتظار الرد"
      },
      {
        "value": "sent",
        "label": "مُرسلة"
      },
      {
        "value": "accepted",
        "label": "مقبولة"
      },
      {
        "value": "declined",
        "label": "معتذر"
      }
    ],
    "badge": true
  },
  {
    "key": "sent_at",
    "label": "تاريخ الإرسال",
    "type": "datetime"
  },
  {
    "key": "responded_at",
    "label": "تاريخ الرد",
    "type": "datetime"
  },
  {
    "key": "notes",
    "label": "ملاحظات",
    "type": "textarea",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/invitations")({
  head: () => ({
    meta: [
      { title: "الدعوات — بوابة إدارة الفعاليات" },
      { name: "description", content: "إرسال ومتابعة الدعوات." },
      { property: "og:title", content: "الدعوات — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "إرسال ومتابعة الدعوات." },
    ],
  }),
  component: () => (
    <CrudPage table="invitations" title="الدعوات" subtitle="إرسال ومتابعة الدعوات" fields={fields} />
  ),
});
