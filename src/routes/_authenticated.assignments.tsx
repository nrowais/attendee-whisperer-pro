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
    "key": "staff_id",
    "label": "الموظف",
    "type": "ref",
    "ref": {
      "table": "staff",
      "labelKey": "full_name"
    }
  },
  {
    "key": "role_in_event",
    "label": "الدور"
  },
  {
    "key": "shift_start",
    "label": "بداية الوردية",
    "type": "datetime"
  },
  {
    "key": "shift_end",
    "label": "نهاية الوردية",
    "type": "datetime"
  },
  {
    "key": "notes",
    "label": "ملاحظات",
    "type": "textarea",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/assignments")({
  head: () => ({
    meta: [
      { title: "التكليفات — بوابة إدارة الفعاليات" },
      { name: "description", content: "توزيع الفريق على الفعاليات." },
      { property: "og:title", content: "التكليفات — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "توزيع الفريق على الفعاليات." },
    ],
  }),
  component: () => (
    <CrudPage table="staff_assignments" title="التكليفات" subtitle="توزيع الفريق على الفعاليات" fields={fields} />
  ),
});
