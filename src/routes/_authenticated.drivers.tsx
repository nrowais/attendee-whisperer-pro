import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "full_name",
    "label": "الاسم"
  },
  {
    "key": "phone",
    "label": "الجوال"
  },
  {
    "key": "license_number",
    "label": "رقم الرخصة"
  },
  {
    "key": "is_available",
    "label": "متاح",
    "type": "switch"
  }
];

export const Route = createFileRoute("/_authenticated/drivers")({
  head: () => ({
    meta: [
      { title: "السائقون — بوابة إدارة الفعاليات" },
      { name: "description", content: "سجل السائقين." },
      { property: "og:title", content: "السائقون — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "سجل السائقين." },
    ],
  }),
  component: () => (
    <CrudPage table="drivers" title="السائقون" subtitle="سجل السائقين" fields={fields} />
  ),
});
