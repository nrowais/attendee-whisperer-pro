import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BedDouble, Car, Mic2, PlaneLanding, PlaneTakeoff } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const db = supabase as any;

const STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدول",
  arrived: "وصل المطار",
  in_transport: "في النقل",
  at_hotel: "في الفندق",
  at_event: "في الفعالية",
  departed: "غادر",
  cancelled: "ملغي",
};

export const Route = createFileRoute("/_authenticated/speakers/$speakerId")({
  head: () => ({
    meta: [
      { title: "ملف المتحدث — غرفة العمليات" },
      { name: "description", content: "البيانات الكاملة للمتحدث: الرحلات والنقل والإقامة والجلسات والطلبات." },
      { property: "og:title", content: "ملف المتحدث — غرفة العمليات" },
      { property: "og:description", content: "ملف تشغيلي شامل لكل متحدث." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpeakerProfile,
});

function fmt(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("ar-SA-u-ca-gregory", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({ title, icon: Icon, children }: any) {
  return (
    <section className="space-y-2 rounded-xl border border-border bg-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </h2>
      <div className="space-y-1 text-xs text-muted-foreground">{children}</div>
    </section>
  );
}

function SpeakerProfile() {
  const { speakerId } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["speaker-profile", speakerId],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [speaker, op, arrivals, departures, trips, bookings, hotels, sessions, requests] =
        await Promise.all([
          db.from("speakers").select("*").eq("id", speakerId).maybeSingle(),
          db.from("guest_operations").select("*").eq("speaker_id", speakerId).maybeSingle(),
          db.from("speaker_arrivals").select("*").eq("speaker_id", speakerId),
          db.from("speaker_departures").select("*").eq("speaker_id", speakerId),
          db.from("transport_trips").select("*").eq("speaker_id", speakerId).order("scheduled_at"),
          db.from("hotel_bookings").select("*").eq("speaker_id", speakerId),
          db.from("hotels").select("id, name"),
          db.from("speaker_sessions").select("*").eq("speaker_id", speakerId).order("starts_at"),
          db.from("speaker_requests").select("*").eq("speaker_id", speakerId),
        ]);
      const hotelNames = new Map((hotels.data ?? []).map((h: any) => [h.id, h.name]));
      return {
        speaker: speaker.data,
        op: op.data,
        arrivals: arrivals.data ?? [],
        departures: departures.data ?? [],
        trips: trips.data ?? [],
        bookings: (bookings.data ?? []).map((b: any) => ({
          ...b,
          hotelName: hotelNames.get(b.hotel_id) ?? "—",
        })),
        sessions: sessions.data ?? [],
        requests: requests.data ?? [],
      };
    },
  });

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!data?.speaker)
    return <p className="text-sm text-muted-foreground">لم يتم العثور على المتحدث.</p>;

  const s = data.speaker;
  const status = data.op?.operational_status ?? "scheduled";

  return (
    <div className="space-y-4" dir="rtl">
      <Link to="/speakers" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        <ArrowRight className="h-3 w-3" /> رجوع إلى المتحدثين
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-card p-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">{s.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {[s.title, s.organization, s.country].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
            {[s.phone, s.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <Badge variant={status === "cancelled" ? "destructive" : "secondary"}>
          {STATUS_LABELS[status] ?? status}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Section title="الوصول" icon={PlaneLanding}>
          {data.arrivals.length === 0 ? (
            <p>لا يوجد وصول مسجل</p>
          ) : (
            data.arrivals.map((a: any) => (
              <p key={a.id}>
                {fmt(a.arrival_time)} · {a.arrival_point ?? "—"} {a.terminal ? `· صالة ${a.terminal}` : ""}
              </p>
            ))
          )}
          <p>الوصول الفعلي: {fmt(data.op?.arrival_actual_time)}</p>
        </Section>

        <Section title="المغادرة" icon={PlaneTakeoff}>
          {data.departures.length === 0 ? (
            <p>لا توجد مغادرة مسجلة</p>
          ) : (
            data.departures.map((d: any) => (
              <p key={d.id}>
                {fmt(d.departure_time)} · {d.departure_point ?? "—"}{" "}
                {d.terminal ? `· صالة ${d.terminal}` : ""}
              </p>
            ))
          )}
          <p>المغادرة الفعلية: {fmt(data.op?.departure_actual_time)}</p>
        </Section>

        <Section title="النقل" icon={Car}>
          {data.trips.length === 0 ? (
            <p>لا توجد رحلات نقل</p>
          ) : (
            data.trips.map((t: any) => (
              <p key={t.id}>
                تذكرة #{t.ticket_no ?? "—"} · {t.pickup_location ?? "—"} ← {t.dropoff_location ?? "—"} ·{" "}
                {fmt(t.scheduled_at)}
              </p>
            ))
          )}
        </Section>

        <Section title="الإقامة" icon={BedDouble}>
          {data.bookings.length === 0 ? (
            <p>لا يوجد حجز إقامة</p>
          ) : (
            data.bookings.map((b: any) => (
              <p key={b.id}>
                {b.hotelName} · {b.check_in ?? "—"} → {b.check_out ?? "—"} · {b.status}
              </p>
            ))
          )}
        </Section>

        <Section title="الجلسات" icon={Mic2}>
          {data.sessions.length === 0 ? (
            <p>لا توجد جلسات</p>
          ) : (
            data.sessions.map((x: any) => (
              <p key={x.id}>
                {x.session_title} · {x.hall ?? "—"} · {fmt(x.starts_at)}
              </p>
            ))
          )}
        </Section>

        <Section title="الطلبات" icon={Mic2}>
          {data.requests.length === 0 ? (
            <p>لا توجد طلبات</p>
          ) : (
            data.requests.map((r: any) => (
              <p key={r.id}>
                {r.title} · {r.priority} · {r.status}
              </p>
            ))
          )}
        </Section>
      </div>
    </div>
  );
}
