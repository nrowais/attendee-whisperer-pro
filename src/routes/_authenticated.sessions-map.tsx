import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Map as MapIcon, MonitorPlay, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  conferenceDays,
  fmtTime,
  nonSpeakerTypes,
  readinessClasses,
  riyadhClock,
  riyadhToday,
  sessionMs,
  sessionReadiness,
  sessionTypeLabels,
  timePhase,
  type SessionType,
} from "@/lib/sessions";
import { cn } from "@/lib/utils";
import { useSessions, useSpeakerOps, useTracks, type SessionRow } from "@/components/sessions/data";
import { SessionDetail } from "@/components/sessions/SessionDetail";
import { SessionEditDialog } from "@/components/sessions/SessionEditDialog";

export const Route = createFileRoute("/_authenticated/sessions-map")({
  head: () => ({
    meta: [
      { title: "خريطة الجلسات التفاعلية — حوار الأمن والتاريخ" },
      { name: "description", content: "خريطة زمنية تفاعلية لجميع جلسات اليوم حسب المسارات." },
      { property: "og:title", content: "خريطة الجلسات التفاعلية" },
      { property: "og:description", content: "استعراض تفاعلي لجلسات المؤتمر على خط زمني." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SessionsMapScreen,
});

const typeColor: Record<string, string> = {
  opening: "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300",
  registration: "bg-sky-500/15 border-sky-500/50 text-sky-700 dark:text-sky-300",
  panel_session: "bg-primary/10 border-primary/40 text-primary",
  interactive_session: "bg-violet-500/15 border-violet-500/50 text-violet-700 dark:text-violet-300",
  special_talk: "bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300",
  special_dialogue: "bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300",
  main_session: "bg-primary/20 border-primary/60 text-primary",
  break: "bg-muted border-border text-muted-foreground",
  prayer_break: "bg-muted border-border text-muted-foreground",
  ceremony: "bg-rose-500/15 border-rose-500/50 text-rose-700 dark:text-rose-300",
  other: "bg-secondary border-border text-foreground",
};

const TRACK_LABEL_W = 180; // px

function toMin(time?: string | null) {
  if (!time) return null;
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

function SessionsMapScreen() {
  const { data: tracks } = useTracks();
  const { data: allSessions } = useSessions();
  const { data: opsMap } = useSpeakerOps();
  const [now, setNow] = useState(() => Date.now());
  const [day, setDay] = useState(() => {
    const today = riyadhToday(new Date());
    if (conferenceDays.some((d) => d.date === today)) return today;
    return conferenceDays.find((d) => d.date >= today)?.date ?? conferenceDays[0]!.date;
  });
  const [detail, setDetail] = useState<SessionRow | null>(null);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const daySessions = useMemo(
    () => (allSessions ?? []).filter((s) => s.session_date === day),
    [allSessions, day],
  );

  // نطاق الساعات: من أول جلسة إلى آخر جلسة (مقرب للساعة)
  const { startHour, endHour } = useMemo(() => {
    let min = 9 * 60;
    let max = 18 * 60;
    for (const s of daySessions) {
      const st = toMin(s.start_time);
      const en = toMin(s.end_time);
      if (st !== null) min = Math.min(min, st);
      if (en !== null) max = Math.max(max, en);
    }
    return { startHour: Math.floor(min / 60), endHour: Math.min(24, Math.ceil(max / 60)) };
  }, [daySessions]);

  const spanMin = (endHour - startHour) * 60;
  const isToday = day === riyadhToday(new Date(now));
  const nowMin = useMemo(() => {
    if (!isToday) return null;
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Riyadh",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .format(new Date(now))
      .split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  }, [now, isToday]);
  const nowPct = nowMin !== null ? ((nowMin - startHour * 60) / spanMin) * 100 : null;

  const dayInfo = conferenceDays.find((d) => d.date === day);
  const eventId = daySessions.find((s) => s.event_id)?.event_id ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-primary p-2.5 text-primary-foreground shadow-md">
              <MapIcon className="size-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold leading-tight text-foreground md:text-3xl">
                خريطة الجلسات التفاعلية
              </h1>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground md:text-sm">
                <CalendarDays className="size-3.5" />
                {dayInfo ? `${dayInfo.label} — ${dayInfo.sub}` : day}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* اختيار اليوم */}
            <div className="flex items-center gap-1 rounded-2xl border border-border bg-secondary/50 p-1">
              {conferenceDays.map((d) => (
                <button
                  key={d.date}
                  onClick={() => setDay(d.date)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-bold transition-colors md:text-sm",
                    day === d.date
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <span
              className="rounded-2xl bg-primary px-4 py-2 font-mono text-2xl font-black tabular-nums text-primary-foreground shadow-lg md:text-3xl"
              dir="ltr"
            >
              {riyadhClock(new Date(now))}
            </span>
            <Button variant="outline" size="icon" asChild aria-label="الشاشة المباشرة" className="size-11 rounded-2xl">
              <Link to="/sessions-live">
                <MonitorPlay className="size-5" />
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

      {/* Legend */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-2 px-6 pt-4">
        <span className="text-xs font-semibold text-muted-foreground">دليل الألوان:</span>
        {(["panel_session", "interactive_session", "special_talk", "special_dialogue", "main_session", "opening", "break", "ceremony"] as SessionType[]).map(
          (t) => (
            <span
              key={t}
              className={cn("rounded-lg border px-2.5 py-1 text-[11px] font-semibold", typeColor[t])}
            >
              {sessionTypeLabels[t]}
            </span>
          ),
        )}
        <span className="ms-auto text-xs text-muted-foreground">
          مرّر المؤشر على أي جلسة لمعاينتها — اضغط عليها لفتح التفاصيل
        </span>
      </div>

      {/* Map */}
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-5">
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <div className="min-w-[900px]">
            {/* محور الساعات */}
            <div className="flex border-b border-border">
              <div className="shrink-0 border-e border-border p-3" style={{ width: TRACK_LABEL_W }}>
                <span className="text-xs font-bold text-muted-foreground">المسار / الوقت</span>
              </div>
              <div className="relative flex-1">
                <div className="flex">
                  {Array.from({ length: endHour - startHour }, (_, i) => startHour + i).map((h) => (
                    <div
                      key={h}
                      className="flex-1 border-e border-border/50 px-1 py-3 text-center font-mono text-xs tabular-nums text-muted-foreground"
                      dir="ltr"
                    >
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* صفوف المسارات */}
            {[
              ...(tracks ?? []),
              ...(daySessions.some((s) => !s.track_id)
                ? [{ id: "__all__", code: "ALL", name_ar: "فعاليات عامة", name_en: null, sort_order: 999 }]
                : []),
            ].map((track) => {
              const trackSessions = daySessions.filter((s) =>
                track.id === "__all__" ? !s.track_id : s.track_id === track.id,
              );
              const trackLive = trackSessions.some((s) => timePhase(s, now).kind === "live");
              return (
                <div key={track.id} className="flex border-b border-border last:border-b-0">
                  {/* اسم المسار */}
                  <div
                    className={cn(
                      "flex shrink-0 flex-col justify-center gap-1 border-e border-border p-3",
                      trackLive && "bg-primary/5",
                    )}
                    style={{ width: TRACK_LABEL_W }}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                      {trackLive ? (
                        <span className="relative flex size-2.5">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
                        </span>
                      ) : null}
                      {track.name_ar}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{trackSessions.length} نشاطًا</span>
                  </div>

                  {/* خط الجلسات */}
                  <div className="relative h-28 flex-1">
                    {/* خطوط الساعات العمودية */}
                    {Array.from({ length: endHour - startHour + 1 }, (_, i) => (
                      <span
                        key={i}
                        className="absolute inset-y-0 border-e border-border/40"
                        style={{ insetInlineStart: `${(i / (endHour - startHour)) * 100}%` }}
                      />
                    ))}

                    {/* مؤشر الوقت الحالي */}
                    {nowPct !== null && nowPct >= 0 && nowPct <= 100 ? (
                      <span
                        className="absolute inset-y-0 z-20 w-0.5 bg-destructive"
                        style={{ insetInlineStart: `${nowPct}%` }}
                      >
                        <span className="absolute -top-1 start-1/2 size-2.5 -translate-x-1/2 rounded-full bg-destructive shadow" />
                      </span>
                    ) : null}

                    {/* كتل الجلسات */}
                    {trackSessions.map((s) => {
                      const st = toMin(s.start_time);
                      if (st === null) return null;
                      const en = toMin(s.end_time) ?? st + (s.duration_minutes ?? 60);
                      const inlineStart = Math.max(0, ((st - startHour * 60) / spanMin) * 100);
                      const width = Math.min(100 - inlineStart, Math.max(2.5, ((en - st) / spanMin) * 100));
                      const phase = timePhase(s, now);
                      const live = phase.kind === "live";
                      const isBreak = nonSpeakerTypes.includes(s.session_type as SessionType);
                      const participants = s.session_participants ?? [];
                      const readiness = sessionReadiness(
                        phase,
                        isBreak
                          ? []
                          : participants.map((p) => (p.speaker_id ? (opsMap?.get(p.speaker_id)?.status ?? null) : null)),
                      );
                      return (
                        <button
                          key={s.id}
                          onClick={() => setDetail(s)}
                          className={cn(
                            "group absolute top-1/2 z-10 flex h-[88px] -translate-y-1/2 flex-col justify-between overflow-hidden rounded-xl border p-2 text-start shadow-sm transition-all duration-200 hover:z-30 hover:scale-[1.04] hover:overflow-visible hover:shadow-xl focus-visible:z-30 focus-visible:scale-[1.04] focus-visible:overflow-visible focus-visible:shadow-xl focus-visible:outline-none",
                            typeColor[s.session_type] ?? typeColor["other"],
                            live && "ring-2 ring-primary shadow-lg",
                          )}
                          style={{ insetInlineStart: `${inlineStart}%`, width: `${width}%` }}
                        >
                          <div className="min-w-0">
                            <p className="flex items-center gap-1 font-mono text-[10px] font-bold tabular-nums opacity-80" dir="ltr">
                              {fmtTime(s.start_time)} - {fmtTime(s.end_time)}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-snug">
                              {s.title_ar || s.title_en || "بدون عنوان"}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {live ? (
                              <span className="flex items-center gap-1 text-[10px] font-black">
                                <span className="size-1.5 animate-pulse rounded-full bg-current" />
                                جارية الآن
                              </span>
                            ) : phase.kind === "ended" ? (
                              <span className="text-[10px] font-semibold opacity-60">انتهت</span>
                            ) : null}
                            {!isBreak && participants.length > 0 ? (
                              <span className="ms-auto text-[10px] opacity-70">{participants.length} مشارك</span>
                            ) : null}
                          </div>

                          {/* تلميح عند التحويم */}
                          <div
                            className={cn(
                              "pointer-events-none absolute top-full start-0 z-40 mt-2 hidden w-72 rounded-xl border border-border bg-popover p-3 text-start shadow-2xl",
                              "group-hover:block group-focus-visible:block",
                            )}
                          >
                            <p className="text-sm font-bold text-popover-foreground">
                              {s.title_ar || s.title_en || "بدون عنوان"}
                            </p>
                            <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground" dir="ltr">
                              {fmtTime(s.start_time)} - {fmtTime(s.end_time)}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">
                                {sessionTypeLabels[s.session_type as SessionType] ?? s.session_type}
                              </Badge>
                              {!isBreak ? (
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                    readinessClasses[readiness.key],
                                  )}
                                >
                                  {readiness.label}
                                </span>
                              ) : null}
                            </div>
                            {participants.length > 0 ? (
                              <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                                {participants.slice(0, 4).map((p) => (
                                  <li key={p.id} className="truncate">
                                    • {p.display_name || p.speakers?.full_name || "غير محدد"}
                                  </li>
                                ))}
                                {participants.length > 4 ? <li>… و{participants.length - 4} آخرون</li> : null}
                              </ul>
                            ) : null}
                            <p className="mt-2 text-[10px] font-semibold text-primary">اضغط لفتح التفاصيل ←</p>
                          </div>
                        </button>
                      );
                    })}

                    {trackSessions.length === 0 ? (
                      <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/60">
                        لا توجد أنشطة في هذا المسار لهذا اليوم
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ملخص اليوم */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            إجمالي أنشطة اليوم: <b className="text-foreground">{daySessions.length}</b>
          </span>
          <span>
            جارية الآن:{" "}
            <b className="text-primary">
              {daySessions.filter((s) => timePhase(s, now).kind === "live").length}
            </b>
          </span>
          <span>
            انتهت:{" "}
            <b className="text-foreground">
              {daySessions.filter((s) => timePhase(s, now).kind === "ended").length}
            </b>
          </span>
        </div>
      </main>

      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        نفذ بواسطة نايف الرويس
      </footer>

      <SessionDetail
        session={detail}
        tracks={tracks ?? []}
        opsMap={opsMap}
        now={now}
        onClose={() => setDetail(null)}
        onEdit={(s) => {
          setDetail(null);
          setEditing(s);
          setEditOpen(true);
        }}
      />

      <SessionEditDialog
        open={editOpen}
        session={editing}
        tracks={tracks ?? []}
        allSessions={allSessions ?? []}
        eventId={eventId}
        defaultDate={day}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditing(null);
        }}
      />
    </div>
  );
}
