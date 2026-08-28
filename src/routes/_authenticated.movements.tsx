import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import { flightFields, arrivalFields, departureFields } from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/movements")({
  head: () => ({
    meta: [
      { title: "السفر والتحركات — بوابة إدارة الفعالية" },
      { name: "description", content: "رحلات الطيران وحركة الوصول والمغادرة للمتحدثين." },
      { property: "og:title", content: "السفر والتحركات — بوابة إدارة الفعالية" },
      { property: "og:description", content: "رحلات الطيران والوصول والمغادرة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MovementsWorkspace,
});

function MovementsWorkspace() {
  return (
    <Workspace
      title="السفر والتحركات"
      subtitle="رحلات الطيران ومواعيد الوصول والمغادرة في مكان واحد."
      tabs={[
        {
          value: "flights",
          label: "رحلات الطيران",
          content: (
            <CrudPage
              compact
              table="flights"
              title="رحلات الطيران"
              subtitle="بيانات الرحلات"
              fields={flightFields}
            />
          ),
        },
        {
          value: "arrivals",
          label: "الوصول",
          content: (
            <CrudPage
              compact
              table="speaker_arrivals"
              title="الوصول"
              subtitle="متابعة وصول المتحدثين"
              fields={arrivalFields}
            />
          ),
        },
        {
          value: "departures",
          label: "المغادرة",
          content: (
            <CrudPage
              compact
              table="speaker_departures"
              title="المغادرة"
              subtitle="متابعة مغادرة المتحدثين"
              fields={departureFields}
            />
          ),
        },
      ]}
    />
  );
}
