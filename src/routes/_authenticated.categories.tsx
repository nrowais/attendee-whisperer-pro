import { createFileRoute } from "@tanstack/react-router";

import { CrudPage, type Field } from "@/components/portal/CrudPage";

const fields: Field[] = [
  {
    "key": "name",
    "label": "التصنيف"
  },
  {
    "key": "description",
    "label": "الوصف",
    "type": "textarea"
  }
];

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({
    meta: [
      { title: "تصنيفات الطلبات — بوابة إدارة الفعاليات" },
      { name: "description", content: "تصنيفات طلبات المتحدثين." },
      { property: "og:title", content: "تصنيفات الطلبات — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "تصنيفات طلبات المتحدثين." },
    ],
  }),
  component: () => (
    <CrudPage table="request_categories" title="تصنيفات الطلبات" subtitle="تصنيفات طلبات المتحدثين" fields={fields} />
  ),
});
