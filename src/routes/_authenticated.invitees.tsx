import { createFileRoute } from "@tanstack/react-router";

import { AttendanceBoard } from "@/components/portal/AttendanceBoard";
import { SeatMap } from "@/components/portal/SeatMap";
import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import {
  inviteeFields,
  invitationFields,
  attendanceFields,
} from "@/lib/tableFields";


export const Route = createFileRoute("/_authenticated/invitees")({
  head: () => ({
    meta: [
      { title: "الضيوف والمدعوون — حوار الأمن والتاريخ" },
      {
        name: "description",
        content: "المدعوون والدعوات والحضور في شاشة واحدة.",
      },
      { property: "og:title", content: "الضيوف والمدعوون — حوار الأمن والتاريخ" },
      { property: "og:description", content: "المدعوون والدعوات والحضور." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InviteesWorkspace,
});

function InviteesWorkspace() {
  return (
    <Workspace
      title="الضيوف والمدعوون"
      subtitle="قائمة المدعوين ودعواتهم وتسجيل حضورهم في الموقع."
      groups={[
        {
          label: "المدعوون والحضور",
          tabs: [
            {
              value: "checkin",
              label: "تسجيل الحضور",
              content: <AttendanceBoard />,
            },
            {
              value: "seatmap",
              label: "خريطة المقاعد",
              content: <SeatMap />,
            },
            {
              value: "invitees",
              label: "المدعوون",
              content: (
                <CrudPage

                  compact
                  table="invitees"
                  title="المدعوون"
                  subtitle="قائمة المدعوين"
                  fields={inviteeFields}
                />
              ),
            },
            {
              value: "invitations",
              label: "الدعوات",
              content: (
                <CrudPage
                  compact
                  table="invitations"
                  title="الدعوات"
                  subtitle="حالة الدعوات والردود"
                  fields={invitationFields}
                />
              ),
            },
            {
              value: "attendance",
              label: "الحضور والتسجيل",
              content: (
                <CrudPage
                  compact
                  table="attendance"
                  title="الحضور"
                  subtitle="تسجيل الحضور في الموقع"
                  fields={attendanceFields}
                />
              ),
            },
          ],
        },
      ]}
    />
  );
}
