import { createFileRoute } from "@tanstack/react-router";

import { OpsPage, StatusPill, type OpsColumn } from "@/components/portal/OpsPage";
import { hotelRows, type HotelRoomRow } from "@/lib/sampleData";

export const Route = createFileRoute("/_authenticated/hotels")({
  head: () => ({
    meta: [
      { title: "الفنادق والسكن — عمليات ضيوف الفعالية" },
      { name: "description", content: "توزيع الضيوف على الفنادق والغرف وحالة الإقامة." },
      { property: "og:title", content: "الفنادق والسكن — عمليات ضيوف الفعالية" },
      { property: "og:description", content: "توزيع الغرف وحالة الإقامة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HotelsPage,
});

const tone: Record<HotelRoomRow["status"], string> = {
  "محجوزة": "info",
  "تم تسجيل الدخول": "success",
  "تم تسجيل الخروج": "muted",
};

const columns: OpsColumn<HotelRoomRow>[] = [
  { key: "guest", label: "الضيف" },
  { key: "hotel", label: "الفندق" },
  { key: "room", label: "الغرفة" },
  { key: "roomType", label: "النوع" },
  { key: "checkIn", label: "تاريخ الدخول" },
  { key: "checkOut", label: "تاريخ الخروج" },
  { key: "status", label: "الحالة", render: (r) => <StatusPill label={r.status} tone={tone[r.status]} /> },
];

function HotelsPage() {
  return (
    <OpsPage
      title="الفنادق والسكن"
      subtitle="إدارة الحجوزات وتوزيع الغرف على الضيوف والمتحدثين."
      kpis={[
        { label: "إجمالي الحجوزات", value: 164 },
        { label: "تم تسجيل الدخول", value: 63 },
        { label: "بانتظار الوصول", value: 88 },
        { label: "غرف شاغرة", value: 22 },
      ]}
      columns={columns}
      rows={hotelRows}
      searchKeys={["guest", "hotel", "room"]}
      statusKey="status"
      statuses={["محجوزة", "تم تسجيل الدخول", "تم تسجيل الخروج"]}
      actionLabel="حجز جديد"
    />
  );
}
