import { createFileRoute } from "@tanstack/react-router";

import { OpsSegment } from "@/components/portal/OpsSegment";

export const Route = createFileRoute("/_authenticated/ops/today")({
  head: () => ({
    meta: [
      { title: "عمليات اليوم — غرفة العمليات" },
      { name: "description", content: "كل حركات اليوم: وصول ومغادرة ونقل وتسجيل فندقي." },
      { property: "og:title", content: "عمليات اليوم — غرفة العمليات" },
      { property: "og:description", content: "متابعة حركات اليوم لحظة بلحظة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <OpsSegment
      segment="today"
      title="عمليات اليوم"
      subtitle="كل من له حركة اليوم: وصول أو مغادرة أو نقل أو تسجيل فندقي."
    />
  ),
});
