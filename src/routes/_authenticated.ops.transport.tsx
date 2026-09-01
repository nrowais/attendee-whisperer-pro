import { createFileRoute } from "@tanstack/react-router";

import { OpsSegment } from "@/components/portal/OpsSegment";

export const Route = createFileRoute("/_authenticated/ops/transport")({
  head: () => ({
    meta: [
      { title: "النقل — غرفة العمليات" },
      { name: "description", content: "الرحلات الجارية حالياً على الطريق." },
      { property: "og:title", content: "النقل — غرفة العمليات" },
      { property: "og:description", content: "الرحلات الجارية حالياً على الطريق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <OpsSegment segment="transport" title="النقل" subtitle="الرحلات الجارية حالياً على الطريق." />
  ),
});
