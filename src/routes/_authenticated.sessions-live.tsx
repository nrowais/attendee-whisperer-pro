import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CircleDot, Map as MapIcon, MonitorPlay, Users, X } from "lucide-react";

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

const readinessDot: Record<string, string> = {
  ready: "bg-emerald-500",
  attention: "bg-amber-500",
  risk: "bg-destructive",
  completed: "bg-muted-foreground",
};

function SessionBlock({
  title,
  session,
  now,
  opsMap,
  prominent,
}: {
  title: string;
  session: SessionRow | null;
  now: number;
  opsMap?: Map<string, any> | undefined;
  prominent?: boolean;
}) {
  if (!session) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border/70 bg-card/40 p-5", prominent && "p-8")}>
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <CircleDot className="size-3.5" />
          {title}
        </p>
        <p className={cn("mt-3 font-semibold text-foreground/50", prominent ? "text-2xl" : "text-lg")}>
          لا توجد جلسة
        </p>
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
  const live = phase.kind === "live";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
        live
          ? "border-primary/40 ring-1 ring-primary/20"
          : prominent
            ? "border-border"
            : "border-border/60 bg-card/60",
        prominent ? "p-6" : "p-4",
      )}
    >
      {live ? (
        <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-primary via-primary/70 to-transparent" />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
          {live ? (
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
          ) : (
            <CircleDot className="size-3.5" />
          )}
          {title}
        </p>
        <span
          className={cn(
            "rounded-lg bg-secondary px-3 py-1 font-mono text-sm font-bold tabular-nums text-primary",
            prominent && "text-base",
          )}
          dir="ltr"
        >
          {fmtTime(session.start_time)} - {fmtTime(session.end_time)}
        </span>
      </div>

      <p
        className={cn(
          "mt-3 font-display font-bold leading-snug text-foreground",
          prominent ? "text-2xl md:text-3xl" : "text-lg",
        )}
      >
        {session.title_ar || session.title_en || "بدون عنوان"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {sessionTypeLabels[session.session_type as SessionType] ?? session.session_type}
        </Badge>
        {!isBreak ? (
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
              readinessClasses[readiness.key],
            )}
          >
            <span className={cn("size-1.5 rounded-full", readinessDot[readiness.key] ?? "bg-muted-foreground")} />
            {readiness.label}
          </span>
        ) : null}
        <span
          className={cn(
            "ms-auto rounded-xl bg-primary/10 px-4 py-1.5 font-mono font-black tabular-nums text-primary",
            prominent ? "text-3xl" : "text-xl",
          )}
          dir="ltr"
        >
          {live ? fmtCountdown(phase.remainingMs) : phase.kind === "upcoming" ? fmtCountdown(phase.inMs) : "—"}
        </span>
      </div>

      {!isBreak && participants.length ? (
        <ul className={cn("mt-5 grid gap-2", prominent ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
          {participants.map((p) => {
            const st = (p.speaker_id && opsMap?.get(p.speaker_id)?.status) || "not_arrived";
            const arrived = st !== "not_arrived";
            return (
              <li
                key={p.id}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm",
                  arrived
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-border/60 bg-secondary/40",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      arrived ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="truncate font-medium">
                    {p.display_name || p.speakers?.full_name || "غير محدد"}
                    {moderatorRoles.includes(p.role as ParticipantRole) ? (
                      <span className="text-xs text-muted-foreground"> (مدير الجلسة)</span>
                    ) : null}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs font-semibold",
                    arrived ? "text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  {opStatusLabels[st]}
                </span>
              </li>
            );
          })}
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
  const liveCount = (tracks ?? []).filter(
    (t) => pickNowNext(sessions ?? [], t.id, now).current !== null,
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-primary p-2.5 text-primary-foreground shadow-md">
              <MonitorPlay className="size-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight text-foreground md:text-3xl">
                شاشة الجلسات المباشرة
              </h1>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
                <CalendarDays className="size-3.5" />
                {today} — بتوقيت الرياض
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-4 py-2">
              <Users className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {liveCount} مسار مباشر الآن
              </span>
            </div>
            <span
              className="rounded-2xl bg-primary px-5 py-2 font-mono text-3xl font-black tabular-nums text-primary-foreground shadow-lg md:text-4xl"
              dir="ltr"
            >
              {riyadhClock(new Date(now))}
            </span>
            <Button variant="outline" size="icon" asChild aria-label="خريطة الجلسات" className="size-11 rounded-2xl">
              <Link to="/sessions-map">
                <MapIcon className="size-5" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild aria-label="إغلاق" className="size-11 rounded-2xl">
              <Link to="/sessions">
                <X className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Tracks */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 content-start gap-6 px-6 py-6 lg:grid-cols-2">
        {(tracks ?? []).map((track) => {
          const { current, next } = pickNowNext(sessions ?? [], track.id, now);
          const isLive = current !== null;
          return (
            <section key={track.id} className="space-y-4">
              <h2
                className={cn(
                  "relative overflow-hidden rounded-2xl px-5 py-3 text-center font-display text-xl font-bold text-primary-foreground shadow-md",
                  isLive ? "bg-primary" : "bg-primary/70",
                )}
              >
                {isLive ? (
                  <span className="absolute inset-y-0 start-0 flex items-center ps-4">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary-foreground opacity-70" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-primary-foreground" />
                    </span>
                  </span>
                ) : null}
                {track.name_ar}
              </h2>
              <SessionBlock title="الجلسة الحالية" session={current} now={now} opsMap={opsMap} prominent />
              <SessionBlock title="الجلسة القادمة" session={next} now={now} opsMap={opsMap} />
            </section>
          );
        })}
      </main>
    </div>
  );
}
