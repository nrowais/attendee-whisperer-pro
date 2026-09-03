import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fmtCountdown,
  fmtTime,
  moderatorRoles,
  nonSpeakerTypes,
  opStatusLabels,
  readinessClasses,
  riyadhClock,
  riyadhToday,
  sessionReadiness,
  sessionTypeLabels,
  timePhase,
  type ParticipantRole,
  type SessionType,
} from "@/lib/sessions";
import { cn } from "@/lib/utils";
import { useSessions, useSpeakerOps, useTracks, type SessionRow } from "@/components/sessions/data";
import { pickNowNext } from "@/components/sessions/NowView";

export const Route = createFileRoute("/_authenticated/sessions-live")({
  head: () => ({
    meta: [
      { title: "شاشة الجلسات المباشرة — حوار الأمن والتاريخ" },
      { name: "description", content: "شاشة غرفة العمليات: الجلسة الجارية والقادمة في كل مسار." },
      { property: "og:title", content: "شاشة الجلسات المباشرة" },
      { property: "og:description", content: "متابعة مباشرة لجلسات المؤتمر في غرفة العمليات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LiveSessionsScreen,
});

function SessionBlock({
  title,
  session,
  now,
  opsMap,
}: {
  title: string;
  session: SessionRow | null;
  now: number;
  opsMap?: Map<string, any>;
}) {
  if (!session) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/5 p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-lg font-semibold text-foreground/70">لا توجد جلسة</p>
      </div>
    );
  }
  const phase = timePhase(session, now);
  const participants = session.session_participants ?? [];
  const isBreak = nonSpeakerTypes.includes(session.session_type as SessionType);
  const readiness = sessionReadiness(
    phase,
    isBreak ? [] : participants.map((p) => (p.speaker_id ? (opsMap?.get(p.speaker_id)?.status ?? null) : null)),
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-muted-foreground">{title}</p>
        <span className="font-mono text-lg tabular-nums text-primary" dir="ltr">
          {fmtTime(session.start_time)} - {fmtTime(session.end_time)}
        </span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold leading-9 text-foreground">
        {session.title_ar || session.title_en || "بدون عنوان"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {sessionTypeLabels[session.session_type as SessionType] ?? session.session_type}
        </Badge>
        {!isBreak ? (
          <span className={cn("rounded-full border px-3 py-1 text-sm font-medium", readinessClasses[readiness.key])}>
            {readiness.label}
          </span>
        ) : null}
        <span className="font-mono text-xl tabular-nums text-primary" dir="ltr">
          {phase.kind === "live"
            ? fmtCountdown(phase.remainingMs)
            : phase.kind === "upcoming"
              ? fmtCountdown(phase.inMs)
              : "—"}
        </span>
      </div>
      {!isBreak && participants.length ? (
        <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          {participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
              <span className="truncate">
                {p.display_name || p.speakers?.full_name || "غير محدد"}
                {moderatorRoles.includes(p.role as ParticipantRole) ? " (مدير الجلسة)" : ""}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {opStatusLabels[(p.speaker_id && opsMap?.get(p.speaker_id)?.status) || "not_arrived"]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LiveSessionsScreen() {
  const { data: tracks } = useTracks();
  const { data: sessions } = useSessions();
  const { data: opsMap } = useSpeakerOps();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const today = riyadhToday(new Date(now));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-6" dir="rtl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">شاشة الجلسات المباشرة</h1>
          <p className="text-sm text-muted-foreground">{today} — بتوقيت الرياض</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-4xl font-bold tabular-nums text-primary" dir="ltr">
            {riyadhClock(new Date(now))}
          </span>
          <Button variant="outline" size="icon" asChild aria-label="إغلاق">
            <Link to="/sessions"><X className="size-5" /></Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {(tracks ?? []).map((track) => {
          const { current, next } = pickNowNext(sessions ?? [], track.id, now);
          return (
            <section key={track.id} className="space-y-3">
              <h2 className="rounded-xl bg-primary px-4 py-2 text-center font-display text-lg font-bold text-primary-foreground">
                {track.name_ar}
              </h2>
              <SessionBlock title="الجلسة الحالية" session={current} now={now} opsMap={opsMap} />
              <SessionBlock title="الجلسة القادمة" session={next} now={now} opsMap={opsMap} />
            </section>
          );
        })}
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground">نفذ بواسطة نايف الرويس</footer>
    </div>
  );
}
