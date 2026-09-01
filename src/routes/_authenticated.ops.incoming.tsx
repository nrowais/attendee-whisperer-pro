import { createFileRoute } from "@tanstack/react-router";

import { OpsSegment } from "@/components/portal/OpsSegment";

export const Route = createFileRoute("/_authenticated/ops/incoming")({
  head: () => ({
    meta: [
      { title: "القادمون — غرفة العمليات" },
      { name: "description", content: "المتحدثون المجدول وصولهم ولم يصلوا بعد." },
      { property: "og:title", content: "القادمون — غرفة العمليات" },
      { property: "og:description", content: "المتحدثون المجدول وصولهم ولم يصلوا بعد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <OpsSegment segment="incoming" title="القادمون" subtitle="المتحدثون المجدول وصولهم ولم يصلوا بعد." />
  ),
});
