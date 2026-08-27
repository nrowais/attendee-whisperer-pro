import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "plate_number",
    "label": "رقم اللوحة"
  },
  {
    "key": "make",
    "label": "الصانع"
  },
  {
    "key": "model",
    "label": "الطراز"
  },
  {
    "key": "capacity",
    "label": "السعة",
    "type": "number"
  },
  {
    "key": "is_available",
    "label": "متاحة",
    "type": "switch"
  }
];

export const Route = createFileRoute("/_authenticated/vehicles")({
  head: () => ({
    meta: [
      { title: "المركبات — بوابة إدارة الفعاليات" },
      { name: "description", content: "أسطول المركبات." },
      { property: "og:title", content: "المركبات — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "أسطول المركبات." },
    ],
  }),
  component: () => (
    <CrudPage table="vehicles" title="المركبات" subtitle="أسطول المركبات" fields={fields} />
  ),
});
