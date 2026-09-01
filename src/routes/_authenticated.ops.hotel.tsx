import { createFileRoute } from "@tanstack/react-router";

import { OpsSegment } from "@/components/portal/OpsSegment";

export const Route = createFileRoute("/_authenticated/ops/hotel")({
  head: () => ({
    meta: [
      { title: "الفندق — غرفة العمليات" },
      { name: "description", content: "الموجودون في الفندق أو في الفعالية." },
      { property: "og:title", content: "الفندق — غرفة العمليات" },
      { property: "og:description", content: "الموجودون في الفندق أو في الفعالية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <OpsSegment segment="hotel" title="الفندق" subtitle="الموجودون في الفندق أو في الفعالية." />
  ),
});
