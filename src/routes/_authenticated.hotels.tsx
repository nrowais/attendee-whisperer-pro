import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { HotelCheckIn } from "@/components/portal/HotelCheckIn";
import { Workspace } from "@/components/portal/Workspace";
import { bookingFields, hotelFields } from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/hotels")({
  head: () => ({
    meta: [
      { title: "الإقامة — حوار الأمن والتاريخ" },
      { name: "description", content: "حجوزات الإقامة وتوزيع الغرف على الضيوف والمتحدثين." },
      { property: "og:title", content: "الإقامة — حوار الأمن والتاريخ" },
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
      subtitle="تسجيل دخول المتحدثين في فنادقهم المسجلة وإدارة أرقام الغرف."
      tabs={[
        {
          value: "checkin",
          label: "تسجيل الإقامة",
          content: <HotelCheckIn />,
        },
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
              subtitle="الفنادق المعتمدة للمؤتمر"
              fields={hotelFields}
            />
          ),
        },
      ]}
    />
  );
}
