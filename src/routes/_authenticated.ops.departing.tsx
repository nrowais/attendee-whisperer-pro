import { createFileRoute } from "@tanstack/react-router";

import { OpsSegment } from "@/components/portal/OpsSegment";

export const Route = createFileRoute("/_authenticated/ops/departing")({
  head: () => ({
    meta: [
      { title: "المغادرون — غرفة العمليات" },
      { name: "description", content: "المغادرون ومن لديهم رحلة مغادرة مجدولة." },
      { property: "og:title", content: "المغادرون — غرفة العمليات" },
      { property: "og:description", content: "المغادرون ومن لديهم رحلة مغادرة مجدولة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <OpsSegment segment="departing" title="المغادرون" subtitle="المغادرون ومن لديهم رحلة مغادرة مجدولة." />
  ),
});
