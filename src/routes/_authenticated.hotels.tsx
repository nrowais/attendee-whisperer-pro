import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import { bookingFields, hotelFields, roomFields } from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/hotels")({
  head: () => ({
    meta: [
      { title: "الإقامة — بوابة إدارة الفعالية" },
      { name: "description", content: "حجوزات الإقامة وتوزيع الغرف على الضيوف والمتحدثين." },
      { property: "og:title", content: "الإقامة — بوابة إدارة الفعالية" },
      { property: "og:description", content: "الفنادق والغرف وحجوزات الإقامة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HotelsWorkspace,
});

function HotelsWorkspace() {
  return (
    <Workspace
      title="الإقامة"
      subtitle="الحجوزات الفندقية وتوزيع الغرف وحالة تسجيل الدخول."
      tabs={[
        {
          value: "bookings",
          label: "الحجوزات",
          content: (
            <CrudPage
              compact
              table="hotel_bookings"
              title="الحجوزات"
              subtitle="حجوزات الإقامة وحالتها"
              fields={bookingFields}
            />
          ),
        },
        {
          value: "hotels",
          label: "الفنادق",
          content: (
            <CrudPage
              compact
              table="hotels"
              title="الفنادق"
              subtitle="الفنادق المتعاقد معها"
              fields={hotelFields}
            />
          ),
        },
        {
          value: "rooms",
          label: "الغرف",
          content: (
            <CrudPage
              compact
              table="hotel_rooms"
              title="الغرف"
              subtitle="غرف الفنادق وأنواعها"
              fields={roomFields}
            />
          ),
        },
      ]}
    />
  );
}
