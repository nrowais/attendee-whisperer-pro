import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "session_title",
    "label": "عنوان الجلسة"
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
    "key": "speaker_id",
    "label": "المتحدث",
    "type": "ref",
    "ref": {
      "table": "speakers",
      "labelKey": "full_name"
    }
  },
  {
    "key": "hall",
    "label": "القاعة"
  },
  {
    "key": "starts_at",
    "label": "البداية",
    "type": "datetime"
  },
  {
    "key": "ends_at",
    "label": "النهاية",
    "type": "datetime"
  },
  {
    "key": "notes",
    "label": "ملاحظات",
    "type": "textarea",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({
    meta: [
      { title: "الجلسات — بوابة إدارة الفعاليات" },
      { name: "description", content: "جلسات المتحدثين وأوقاتها وقاعاتها." },
      { property: "og:title", content: "الجلسات — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "جلسات المتحدثين وأوقاتها وقاعاتها." },
    ],
  }),
  component: () => (
    <CrudPage table="speaker_sessions" title="الجلسات" subtitle="جلسات المتحدثين وأوقاتها وقاعاتها" fields={fields} />
  ),
});
