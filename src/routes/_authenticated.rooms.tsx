import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
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
    "key": "room_number",
    "label": "رقم الغرفة"
  },
  {
    "key": "room_type",
    "label": "نوع الغرفة"
  },
  {
    "key": "capacity",
    "label": "السعة",
    "type": "number"
  },
  {
    "key": "nightly_rate",
    "label": "سعر الليلة",
    "type": "number"
  }
];

export const Route = createFileRoute("/_authenticated/rooms")({
  head: () => ({
    meta: [
      { title: "الغرف — بوابة إدارة الفعاليات" },
      { name: "description", content: "غرف الفنادق وأسعارها." },
      { property: "og:title", content: "الغرف — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "غرف الفنادق وأسعارها." },
    ],
  }),
  component: () => (
    <CrudPage table="hotel_rooms" title="الغرف" subtitle="غرف الفنادق وأسعارها" fields={fields} />
  ),
});
