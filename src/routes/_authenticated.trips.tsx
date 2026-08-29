import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import { tripFields, driverFields, vehicleFields } from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({
    meta: [
      { title: "النقل الأرضي — حوار الأمن والتاريخ" },
      { name: "description", content: "جدولة رحلات النقل وإدارة السائقين والمركبات." },
      { property: "og:title", content: "النقل الأرضي — حوار الأمن والتاريخ" },
      { property: "og:description", content: "رحلات النقل والسائقون والمركبات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TripsWorkspace,
});

function TripsWorkspace() {
  return (
    <Workspace
      title="النقل الأرضي"
      subtitle="رحلات التنقل بين المطار والفنادق ومقر الفعالية."
      tabs={[
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
          value: "drivers",
          label: "السائقون",
          content: (
            <CrudPage
              compact
              table="drivers"
              title="السائقون"
              subtitle="سجل السائقين وحالة التوفر"
              fields={driverFields}
            />
          ),
        },
        {
          value: "vehicles",
          label: "المركبات",
          content: (
            <CrudPage
              compact
              table="vehicles"
              title="المركبات"
              subtitle="أسطول المركبات"
              fields={vehicleFields}
            />
          ),
        },
      ]}
    />
  );
}
