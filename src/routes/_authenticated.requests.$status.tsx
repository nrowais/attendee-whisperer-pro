import { createFileRoute } from "@tanstack/react-router";

import { CrudPage } from "@/components/portal/CrudPage";
import { requestFields } from "@/lib/tableFields";

const MAP: Record<string, { value: string; title: string; subtitle: string }> = {
  new: { value: "open", title: "طلبات جديدة", subtitle: "طلبات لم يبدأ تنفيذها بعد" },
  "in-progress": { value: "in_progress", title: "طلبات جاري تنفيذها", subtitle: "طلبات تحت التنفيذ حالياً" },
  done: { value: "done", title: "طلبات مكتملة", subtitle: "طلبات تم إنجازها" },
};

export const Route = createFileRoute("/_authenticated/requests/$status")({
  head: () => ({
    meta: [
      { title: "الطلبات — غرفة العمليات" },
      { name: "description", content: "متابعة طلبات المتحدثين حسب حالة التنفيذ." },
      { property: "og:title", content: "الطلبات — غرفة العمليات" },
      { property: "og:description", content: "طلبات جديدة وجارية ومكتملة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const { status } = Route.useParams();
  const cfg = MAP[status] ?? MAP["new"]!;
  return (
    <div dir="rtl">
      <CrudPage
        table="speaker_requests"
        title={cfg.title}
        subtitle={cfg.subtitle}
        fields={requestFields}
        filter={{ key: "status", value: cfg.value }}
      />
    </div>
  );
}
