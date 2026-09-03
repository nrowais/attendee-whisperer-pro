import { useMemo } from "react";

import { fmtTime } from "@/lib/sessions";
import { SessionCard } from "./SessionCard";
import type { SessionRow, SpeakerOps, TrackRow } from "./data";

function toMin(time?: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

function label(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function SessionsTimeline({
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
  onOpen: (session: SessionRow) => void;
}) {
  const slots = useMemo(() => {
    const starts = sessions.map((s) => toMin(s.start_time)).filter((v): v is number => v !== null);
    const ends = sessions
      .map((s) => toMin(s.end_time) ?? toMin(s.start_time))
      .filter((v): v is number => v !== null);
    if (!starts.length) return [];
    const from = Math.floor(Math.min(...starts) / 30) * 30;
    const to = Math.ceil(Math.max(...ends, ...starts) / 30) * 30;
    const out: number[] = [];
    for (let m = from; m <= to; m += 30) out.push(m);
    return out;
  }, [sessions]);

  const conflictIds = useMemo(() => {
    const set = new Set<string>();
    for (const track of tracks) {
      const list = sessions
        .filter((s) => s.track_id === track.id && s.start_time)
        .sort((a, b) => (a.start_time! < b.start_time! ? -1 : 1));
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const a = list[i];
          const b = list[j];
          const aEnd = fmtTime(a.end_time) === "—" ? fmtTime(a.start_time) : fmtTime(a.end_time);
          if (fmtTime(b.start_time) < aEnd) {
            set.add(a.id);
            set.add(b.id);
          }
        }
      }
    }
    return set;
  }, [sessions, tracks]);

  const bySlot = (trackId: string | null, slot: number) =>
    sessions.filter((s) => {
      const start = toMin(s.start_time);
      if (start === null) return false;
      return s.track_id === trackId && Math.floor(start / 30) * 30 === slot;
    });

  const untracked = sessions.filter((s) => !s.track_id || !tracks.some((t) => t.id === s.track_id));

  if (!sessions.length) {
    return (
      <p className="surface-card p-8 text-center text-sm text-muted-foreground">
        لا توجد جلسات مطابقة لهذا اليوم أو للفلاتر المحددة.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* ترويسة المسارات — سطح المكتب */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-[80px_repeat(2,minmax(0,1fr))]">
        <div />
        {tracks.map((t) => (
          <div
            key={t.id}
            className="sticky top-0 z-10 rounded-xl bg-primary px-4 py-2 text-center font-display text-sm font-bold text-primary-foreground"
          >
            {t.name_ar}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {slots.map((slot) => {
          const rows = tracks.map((t) => ({ track: t, items: bySlot(t.id, slot) }));
          const empty = rows.every((r) => r.items.length === 0);
          return (
            <div key={slot} className={empty ? "opacity-60" : ""}>
              {/* سطح المكتب */}
              <div className="hidden gap-3 lg:grid lg:grid-cols-[80px_repeat(2,minmax(0,1fr))]">
                <div className="pt-2 text-start font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
                  {label(slot)}
                </div>
                {rows.map(({ track, items }) => (
                  <div key={track.id} className="min-h-[44px] space-y-2 border-t border-dashed border-border pt-2">
                    {items.map((s) => (
                      <SessionCard
                        key={s.id}
                        session={s}
                        trackName={track.name_ar}
                        now={now}
                        opsMap={opsMap}
                        conflict={conflictIds.has(s.id)}
                        onOpen={() => onOpen(s)}
                      />
                    ))}
                  </div>
                ))}
              </div>

              {/* الجوال */}
              {!empty ? (
                <div className="space-y-2 lg:hidden">
                  <p className="font-mono text-xs font-bold tabular-nums text-primary" dir="ltr">
                    {label(slot)}
                  </p>
                  {rows.map(({ track, items }) =>
                    items.length ? (
                      <div key={track.id} className="space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground">{track.name_ar}</p>
                        {items.map((s) => (
                          <SessionCard
                            key={s.id}
                            session={s}
                            trackName={track.name_ar}
                            now={now}
                            opsMap={opsMap}
                            conflict={conflictIds.has(s.id)}
                            onOpen={() => onOpen(s)}
                          />
                        ))}
                      </div>
                    ) : null,
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {untracked.length ? (
        <div className="space-y-2">
          <p className="font-display text-sm font-bold text-foreground">بدون مسار محدد</p>
          {untracked.map((s) => (
            <SessionCard key={s.id} session={s} now={now} opsMap={opsMap} onOpen={() => onOpen(s)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
