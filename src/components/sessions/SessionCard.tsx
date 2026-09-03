import { AlertTriangle, Clock, Mic2, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  fmtCountdown,
  fmtDuration,
  fmtTime,
  moderatorRoles,
  nonSpeakerTypes,
  readinessClasses,
  sessionReadiness,
  sessionStatusLabels,
  sessionTypeLabels,
  timeAlertLabel,
  timePhase,
  type ParticipantRole,
  type SessionStatus,
  type SessionType,
} from "@/lib/sessions";
import type { SessionRow, SpeakerOps } from "./data";

export function SessionCard({
  session,
  trackName,
  now,
  opsMap,
  onOpen,
  conflict,
  compact,
}: {
  session: SessionRow;
  trackName?: string | undefined;
  now: number;
  opsMap?: Map<string, SpeakerOps> | undefined;
  onOpen?: () => void;
  conflict?: boolean | undefined;
  compact?: boolean | undefined;
}) {
  const phase = timePhase(session, now);
  const participants = session.session_participants ?? [];
  const moderators = participants.filter((p) => moderatorRoles.includes(p.role as ParticipantRole));
  const speakers = participants.filter((p) => !moderatorRoles.includes(p.role as ParticipantRole));
  const isBreak = nonSpeakerTypes.includes(session.session_type as SessionType);
  const statuses = isBreak
    ? []
    : participants.map((p) => (p.speaker_id ? (opsMap?.get(p.speaker_id)?.status ?? null) : null));
  const readiness = sessionReadiness(phase, statuses);
  const alert = timeAlertLabel(phase);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-xl border bg-card p-3 text-start shadow-sm transition-colors hover:border-primary/60",
        phase.kind === "live" && "border-primary ring-1 ring-primary/40",
        isBreak && "bg-secondary/50",
        session.status === "cancelled" && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-display text-sm font-bold tabular-nums text-primary" dir="ltr">
          {fmtTime(session.start_time)} - {fmtTime(session.end_time)}
        </span>
        <Badge variant="outline" className="text-[11px]">
          {sessionTypeLabels[session.session_type as SessionType] ?? session.session_type}
        </Badge>
      </div>

      <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
        {session.title_ar || session.title_en || "بدون عنوان"}
      </p>

      {!compact ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {fmtDuration(session.duration_minutes)}
          </span>
          {!isBreak ? (
            <span className="inline-flex items-center gap-1">
              <Mic2 className="size-3" />
              {speakers.length} متحدثين
            </span>
          ) : null}
          {moderators.length ? (
            <span className="inline-flex items-center gap-1">
              <UserCog className="size-3" />
              {moderators.map((m) => m.display_name || m.speakers?.full_name).join("، ")}
            </span>
          ) : null}
          {trackName ? <span>{trackName}</span> : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[11px]">
          {sessionStatusLabels[session.status as SessionStatus] ?? session.status}
        </Badge>
        {!isBreak ? (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium",
              readinessClasses[readiness.key],
            )}
          >
            {readiness.label}
            {readiness.hint ? ` — ${readiness.hint}` : ""}
          </span>
        ) : null}
        {alert ? (
          <span className="text-[11px] font-medium text-primary">{alert}</span>
        ) : null}
        {phase.kind === "upcoming" ? (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground" dir="ltr">
            {fmtCountdown(phase.inMs)}
          </span>
        ) : null}
        {phase.kind === "live" ? (
          <span className="font-mono text-[11px] tabular-nums text-primary" dir="ltr">
            {fmtCountdown(phase.remainingMs)}
          </span>
        ) : null}
        {conflict ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
            <AlertTriangle className="size-3" /> تعارض في نفس المسار
          </span>
        ) : null}
      </div>
    </button>
  );
}
