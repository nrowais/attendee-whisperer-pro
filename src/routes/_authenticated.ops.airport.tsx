import { createFileRoute } from "@tanstack/react-router";

import { OpsSegment } from "@/components/portal/OpsSegment";

export const Route = createFileRoute("/_authenticated/ops/airport")({
  head: () => ({
    meta: [
      { title: "الموجودون بالمطار — غرفة العمليات" },
      { name: "description", content: "من وصل المطار وينتظر الاستقبال أو النقل." },
      { property: "og:title", content: "الموجودون بالمطار — غرفة العمليات" },
      { property: "og:description", content: "من وصل المطار وينتظر الاستقبال أو النقل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <OpsSegment segment="airport" title="الموجودون بالمطار" subtitle="من وصل المطار وينتظر الاستقبال أو النقل." />
  ),
});
