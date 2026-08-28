import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { Workspace } from "@/components/portal/Workspace";
import { speakerFields, sessionFields, requestFields } from "@/lib/tableFields";

export const Route = createFileRoute("/_authenticated/speakers")({
  head: () => ({
    meta: [
      { title: "المتحدثون — بوابة إدارة الفعالية" },
      { name: "description", content: "بيانات المتحدثين وجلساتهم وطلباتهم الخاصة في مكان واحد." },
      { property: "og:title", content: "المتحدثون — بوابة إدارة الفعالية" },
      { property: "og:description", content: "بيانات المتحدثين وجلساتهم وطلباتهم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpeakersWorkspace,
});

function SpeakersWorkspace() {
  return (
    <Workspace
      title="المتحدثون"
      subtitle="كل ما يخص المتحدث: بياناته، جلساته، وطلباته الخاصة."
      tabs={[
        {
          value: "list",
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
      ]}
    />
  );
}
