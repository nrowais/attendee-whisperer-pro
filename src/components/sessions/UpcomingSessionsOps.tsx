import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fmtCountdown,
  fmtTime,
  nonSpeakerTypes,
  readinessClasses,
  sessionReadiness,
  timePhase,
  type SessionType,
} from "@/lib/sessions";
import { cn } from "@/lib/utils";
import { useSessions, useSpeakerOps, useTracks } from "./data";

const AT_VENUE = ["at_venue", "to_venue"];

export function UpcomingSessionsOps() {
  const { data: sessions, isLoading } = useSessions();
  const { data: tracks } = useTracks();
  const { data: opsMap } = useSpeakerOps();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const upcoming = (sessions ?? [])
    .map((s) => ({ s, phase: timePhase(s, now) }))
    .filter((x) => x.phase.kind === "upcoming" || x.phase.kind === "live")
    .sort((a, b) =>
      `${a.s.session_date}${a.s.start_time}` < `${b.s.session_date}${b.s.start_time}` ? -1 : 1,
    )
    .slice(0, 5);

  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-secondary p-2 text-primary">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-bold text-foreground">الجلسات القادمة</p>
            <span className="text-xs text-muted-foreground">جاهزية المتحدثين لكل جلسة</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sessions">
            خريطة الجلسات <ArrowLeft className="size-4" />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : upcoming.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">لا توجد جلسات قادمة حاليًا.</p>
      ) : (
        <ul className="divide-y divide-border">
          {upcoming.map(({ s, phase }) => {
            const participants = (s.session_participants ?? []).filter((p) => p.speaker_id);
            const isBreak = nonSpeakerTypes.includes(s.session_type as SessionType);
            const statuses = participants.map((p) => opsMap?.get(p.speaker_id!)?.status ?? null);
            const atVenue = statuses.filter((st) => st && AT_VENUE.includes(st)).length;
            const notReady = participants.length - atVenue;
            const readiness = sessionReadiness(phase, isBreak ? [] : statuses);
            return (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.title_ar || "جلسة"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtTime(s.start_time)} — {tracks?.find((t) => t.id === s.track_id)?.name_ar ?? "بدون مسار"}
                    {!isBreak
                      ? ` · ${participants.length} متحدثين · ${atVenue} في الموقع · ${notReady} غير جاهز`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-xs tabular-nums text-primary" dir="ltr">
                    {phase.kind === "upcoming" ? fmtCountdown(phase.inMs) : "الآن"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      readinessClasses[readiness.key],
                    )}
                  >
                    {readiness.key === "risk" || readiness.key === "attention" ? (
                      <AlertTriangle className="size-3" />
                    ) : null}
                    {readiness.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
