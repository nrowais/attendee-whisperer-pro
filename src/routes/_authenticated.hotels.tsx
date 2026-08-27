import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "name",
    "label": "اسم الفندق"
  },
  {
    "key": "city",
    "label": "المدينة"
  },
  {
    "key": "address",
    "label": "العنوان"
  },
  {
    "key": "phone",
    "label": "الهاتف"
  },
  {
    "key": "rating",
    "label": "التصنيف",
    "type": "number"
  }
];

export const Route = createFileRoute("/_authenticated/hotels")({
  head: () => ({
    meta: [
      { title: "الفنادق — بوابة إدارة الفعاليات" },
      { name: "description", content: "الفنادق المتعاقد معها." },
      { property: "og:title", content: "الفنادق — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "الفنادق المتعاقد معها." },
    ],
  }),
  component: () => (
    <CrudPage table="hotels" title="الفنادق" subtitle="الفنادق المتعاقد معها" fields={fields} />
  ),
});
