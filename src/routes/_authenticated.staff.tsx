import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "full_name",
    "label": "الاسم"
  },
  {
    "key": "job_title",
    "label": "المسمى"
  },
  {
    "key": "department",
    "label": "الإدارة"
  },
  {
    "key": "phone",
    "label": "الجوال"
  },
  {
    "key": "email",
    "label": "البريد"
  }
];

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "الموظفون — بوابة إدارة الفعاليات" },
      { name: "description", content: "فريق العمل المنظم." },
      { property: "og:title", content: "الموظفون — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "فريق العمل المنظم." },
    ],
  }),
  component: () => (
    <CrudPage table="staff" title="الموظفون" subtitle="فريق العمل المنظم" fields={fields} />
  ),
});
