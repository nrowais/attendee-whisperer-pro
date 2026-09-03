import { fmtCountdown, fmtTime, timePhase } from "@/lib/sessions";
import { SessionCard } from "./SessionCard";
import type { SessionRow, SpeakerOps, TrackRow } from "./data";

export function pickNowNext(sessions: SessionRow[], trackId: string, now: number) {
  const list = sessions.filter((s) => s.track_id === trackId);
  const current = list.find((s) => timePhase(s, now).kind === "live") ?? null;
  const upcoming = list
    .filter((s) => timePhase(s, now).kind === "upcoming")
    .sort((a, b) => (`${a.session_date}${a.start_time}` < `${b.session_date}${b.start_time}` ? -1 : 1));
  return { current, next: upcoming[0] ?? null };
}

export function NowView({
  sessions,
  tracks,
  now,
  opsMap,
  onOpen,
}: {
  sessions: SessionRow[];
  tracks: TrackRow[];
  now: number;
  opsMap?: Map<string, SpeakerOps> | undefined;
  onOpen: (s: SessionRow) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {tracks.map((track) => {
        const { current, next } = pickNowNext(sessions, track.id, now);
        const nextPhase = next ? timePhase(next, now) : null;
        return (
          <section key={track.id} className="surface-card space-y-4 p-5">
            <h2 className="font-display text-lg font-bold text-foreground">{track.name_ar}</h2>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">الآن</p>
              {current ? (
                <SessionCard session={current} now={now} opsMap={opsMap} onOpen={() => onOpen(current)} />
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد جلسة جارية حاليًا.</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">القادمة</p>
              {next ? (
                <>
                  <SessionCard session={next} now={now} opsMap={opsMap} onOpen={() => onOpen(next)} />
                  <p className="text-xs text-muted-foreground">
                    {next.session_date} — {fmtTime(next.start_time)} · تبدأ بعد{" "}
                    <span className="font-mono tabular-nums" dir="ltr">
                      {nextPhase?.kind === "upcoming" ? fmtCountdown(nextPhase.inMs) : "—"}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد جلسات قادمة.</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
