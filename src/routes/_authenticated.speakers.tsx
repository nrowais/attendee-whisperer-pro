import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { HotelCheckIn } from "@/components/portal/HotelCheckIn";
import { SpeakersStatusBoard } from "@/components/portal/SpeakersStatusBoard";
import { SpeakerSessionsPanel } from "@/components/sessions/SpeakerSessionsPanel";
import { Workspace } from "@/components/portal/Workspace";
import {
  speakerFields,
  sessionFields,
  requestFields,
  guestOperationFields,
  driverCardFields,
  bookingFields,
} from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/speakers")({
  head: () => ({
    meta: [
      { title: "الضيوف والمتحدثون — حوار الأمن والتاريخ" },
      {
        name: "description",
        content: "المتحدثون والمدعوون والجلسات والطلبات والحضور في شاشة واحدة.",
      },
      { property: "og:title", content: "الضيوف والمتحدثون — حوار الأمن والتاريخ" },
      { property: "og:description", content: "المتحدثون والمدعوون والجلسات والحضور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuestsWorkspace,
});

function GuestsWorkspace() {
  return (
    <Workspace
      title="المتحدثون"
      subtitle="المتحدثون وحالتهم التشغيلية وجلساتهم وطلباتهم الخاصة."
      groups={[
        {
          label: "المتحدثون",
          tabs: [
            {
              value: "board",
              label: "لوحة الحالات",
              content: <SpeakersStatusBoard />,
            },
            {
              value: "speakers",
              label: "قائمة المتحدثين",
              content: (
                <CrudPage
                  compact
                  table="speakers"
                  title="المتحدثون"
                  subtitle="سجل المتحدثين المشاركين"
                  fields={speakerFields}
                />
              ),
            },
            {
              value: "operations",
              label: "الحالة التشغيلية",
              content: (
                <CrudPage
                  compact
                  table="guest_operations"
                  title="الحالة التشغيلية"
                  subtitle="تُسجَّل الأوقات الفعلية يدوياً من فريق العمل"
                  fields={guestOperationFields}
                />
              ),
            },
            {
              value: "sessions",
              label: "الجلسات",
              content: (
                <CrudPage
                  compact
                  table="speaker_sessions"
                  title="الجلسات"
                  subtitle="جدول جلسات المتحدثين"
                  fields={sessionFields}
                />
              ),
            },
            {
              value: "speaker-sessions",
              label: "جلسات المتحدثين",
              content: <SpeakerSessionsPanel />,
            },
            {
              value: "driver-cards",
              label: "بطاقات السائق",
              content: (
                <CrudPage
                  compact
                  table="driver_cards"
                  title="بطاقات توجيه السائق"
                  subtitle="البطاقات المحفوظة في ملفات الضيوف بأرقامها التسلسلية"
                  fields={driverCardFields}
                />
              ),
            },
            {
              value: "requests",
              label: "الطلبات الخاصة",
              content: (
                <CrudPage
                  compact
                  table="speaker_requests"
                  title="الطلبات الخاصة"
                  subtitle="طلبات المتحدثين ومتابعة تنفيذها"
                  fields={requestFields}
                />
              ),
            },
          ],
        },
        {
          label: "الإقامة",
          tabs: [
            {
              value: "hotel-checkin",
              label: "تسجيل دخول الفندق",
              content: <HotelCheckIn />,
            },
            {
              value: "hotel-bookings",
              label: "الحجوزات",
              content: (
                <CrudPage
                  compact
                  table="hotel_bookings"
                  title="حجوزات الإقامة"
                  subtitle="الفندق ورقم الغرفة وتواريخ الإقامة"
                  fields={bookingFields}
                />
              ),
            },
          ],
        },
      ]}
    />
  );
}
