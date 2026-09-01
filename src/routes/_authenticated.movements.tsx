import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import {
  flightFields,
  arrivalFields,
  departureFields,
  tripFields,
  driverFields,
  vehicleFields,
} from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/movements")({
  head: () => ({
    meta: [
      { title: "التنقلات — حوار الأمن والتاريخ" },
      {
        name: "description",
        content: "رحلات الطيران والوصول والمغادرة والنقل الأرضي والسائقون والمركبات.",
      },
      { property: "og:title", content: "التنقلات — حوار الأمن والتاريخ" },
      { property: "og:description", content: "الطيران والوصول والمغادرة والنقل الأرضي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MovementsWorkspace,
});

function MovementsWorkspace() {
  return (
    <Workspace
      title="التنقلات"
      subtitle="السفر الجوي والنقل الأرضي في شاشة واحدة."
      groups={[
        {
          label: "السفر الجوي",
          tabs: [
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
          ],
        },
        {
          label: "النقل الأرضي",
          tabs: [
            {
              value: "trips",
              label: "رحلات النقل",
              content: (
                <CrudPage
                  compact
                  table="transport_trips"
                  title="رحلات النقل"
                  subtitle="جدولة ومتابعة التنقلات"
                  fields={tripFields}
                />
              ),
            },
            {
              value: "fleet",
              label: "السائقون والمركبات",
              content: (
                <div className="grid gap-6 xl:grid-cols-2">
                  <CrudPage
                    compact
                    table="drivers"
                    title="السائقون"
                    subtitle="سجل السائقين وحالة التوفر"
                    fields={driverFields}
                  />
                  <CrudPage
                    compact
                    table="vehicles"
                    title="المركبات"
                    subtitle="أسطول المركبات"
                    fields={vehicleFields}
                  />
                </div>
              ),
            },
          ],
        },
      ]}
    />
  );
}
