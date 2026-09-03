import { timePhase } from "@/lib/sessions";
import { SessionCard } from "./SessionCard";
import type { SessionRow, SpeakerOps, TrackRow } from "./data";

const buckets = [
  { label: "خلال 30 دقيقة", max: 30 },
  { label: "خلال ساعة", max: 60 },
  { label: "خلال ساعتين", max: 120 },
];

export function UpcomingView({
  sessions,
  tracks,
  now,
  opsMap,
  onOpen,
}: {
  sessions: SessionRow[];
  tracks: TrackRow[];
  now: number;
  opsMap?: Map<string, SpeakerOps>;
  onOpen: (s: SessionRow) => void;
}) {
  const upcoming = sessions
    .map((s) => ({ s, phase: timePhase(s, now) }))
    .filter((x) => x.phase.kind === "upcoming")
    .sort((a, b) => (a.phase as any).inMs - (b.phase as any).inMs);

  return (
    <div className="space-y-6">
      {buckets.map((bucket, index) => {
        const min = index === 0 ? 0 : buckets[index - 1].max;
        const items = upcoming.filter(
          (x) => (x.phase as any).inMs / 60_000 > min && (x.phase as any).inMs / 60_000 <= bucket.max,
        );
        return (
          <section key={bucket.label} className="space-y-2">
            <h3 className="font-display text-sm font-bold text-foreground">{bucket.label}</h3>
            {items.length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {items.map(({ s }) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    trackName={tracks.find((t) => t.id === s.track_id)?.name_ar}
                    now={now}
                    opsMap={opsMap}
                    onOpen={() => onOpen(s)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">لا توجد جلسات في هذه الفترة.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
