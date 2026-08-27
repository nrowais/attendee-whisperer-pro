import { createFileRoute } from "@tanstack/react-router";

import { OpsPage, StatusPill, type OpsColumn } from "@/components/portal/OpsPage";
import { speakerRows, type SpeakerRow } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/speakers")({
  head: () => ({
    meta: [
      { title: "المتحدثون — عمليات ضيوف الفعالية" },
      { name: "description", content: "سجل المتحدثين وبياناتهم وحالتهم التشغيلية خلال الفعالية." },
      { property: "og:title", content: "المتحدثون — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "سجل المتحدثين وحالتهم التشغيلية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpeakersPage,
});

const tone: Record<SpeakerRow["status"], string> = {
  "لم يصل": "muted",
  "في المطار": "warning",
  "بالطريق": "info",
  "في الفندق": "success",
  "في موقع الفعالية": "primary",
  "غادر": "muted",
};

const columns: OpsColumn<SpeakerRow>[] = [
  {
    key: "photo",
    label: "الصورة",
    render: (r) => (
      <img
        src={r.photo}
        alt={`صورة ${r.name}`}
        loading="lazy"
        className="size-9 rounded-full border border-border object-cover"
      />
    ),
  },
  { key: "name", label: "الاسم" },
  { key: "title", label: "المسمى" },
  { key: "org", label: "الجهة" },
  { key: "country", label: "الدولة" },
  { key: "session", label: "الجلسة" },
  { key: "status", label: "الحالة", render: (r) => <StatusPill label={r.status} tone={tone[r.status]} /> },
];

function SpeakersPage() {
  return (
    <OpsPage
      title="المتحدثون"
      subtitle="سجل المتحدثين المشاركين وحالتهم التشغيلية لحظة بلحظة."
      kpis={[
        { label: "إجمالي المتحدثين", value: 180 },
        { label: "وصلوا", value: 112 },
        { label: "في الفندق", value: 63 },
        { label: "في موقع الفعالية", value: 26 },
      ]}
      columns={columns}
      rows={speakerRows}
      searchKeys={["name", "org", "country", "session"]}
      statusKey="status"
      statuses={["لم يصل", "في المطار", "بالطريق", "في الفندق", "في موقع الفعالية", "غادر"]}
      actionLabel="إضافة متحدث"
    />
  );
}
