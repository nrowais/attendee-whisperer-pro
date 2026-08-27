import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "airline",
    "label": "شركة الطيران"
  },
  {
    "key": "flight_number",
    "label": "رقم الرحلة"
  },
  {
    "key": "origin",
    "label": "من"
  },
  {
    "key": "destination",
    "label": "إلى"
  },
  {
    "key": "departure_time",
    "label": "الإقلاع",
    "type": "datetime"
  },
  {
    "key": "arrival_time",
    "label": "الوصول",
    "type": "datetime"
  },
  {
    "key": "booking_ref",
    "label": "رقم الحجز",
    "list": false
  }
];

export const Route = createFileRoute("/_authenticated/flights")({
  head: () => ({
    meta: [
      { title: "الرحلات الجوية — بوابة إدارة الفعاليات" },
      { name: "description", content: "بيانات رحلات الطيران." },
      { property: "og:title", content: "الرحلات الجوية — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "بيانات رحلات الطيران." },
    ],
  }),
  component: () => (
    <CrudPage table="flights" title="الرحلات الجوية" subtitle="بيانات رحلات الطيران" fields={fields} />
  ),
});
