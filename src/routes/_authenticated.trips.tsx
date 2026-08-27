import { createFileRoute } from "@tanstack/react-router";

import { OpsPage, StatusPill, type OpsColumn } from "@/components/portal/OpsPage";
import { tripRows, type TripRow } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/trips")({
  head: () => ({
    meta: [
      { title: "النقل والسيارات — عمليات ضيوف الفعالية" },
      { name: "description", content: "جدولة رحلات النقل وتوزيع السائقين والمركبات." },
      { property: "og:title", content: "النقل والسيارات — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "رحلات النقل والسائقون والمركبات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TripsPage,
});

const tone: Record<TripRow["status"], string> = {
  "مجدولة": "info",
  "جارية": "warning",
  "مكتملة": "success",
  "ملغاة": "danger",
};

const columns: OpsColumn<TripRow>[] = [
  { key: "passenger", label: "الراكب" },
  { key: "driver", label: "السائق" },
  { key: "vehicle", label: "المركبة" },
  { key: "from", label: "من" },
  { key: "to", label: "إلى" },
  { key: "time", label: "الوقت" },
  { key: "status", label: "الحالة", render: (r) => <StatusPill label={r.status} tone={tone[r.status]} /> },
];

function TripsPage() {
  return (
    <OpsPage
      title="النقل والسيارات"
      subtitle="متابعة رحلات التنقل بين المطار والفنادق وموقع الفعالية."
      kpis={[
        { label: "رحلات اليوم", value: 74 },
        { label: "جارية الآن", value: 11 },
        { label: "سائقون نشطون", value: 28 },
        { label: "مركبات متاحة", value: 16 },
      ]}
      columns={columns}
      rows={tripRows}
      searchKeys={["passenger", "driver", "vehicle"]}
      statusKey="status"
      statuses={["مجدولة", "جارية", "مكتملة", "ملغاة"]}
      actionLabel="رحلة جديدة"
    />
  );
}
