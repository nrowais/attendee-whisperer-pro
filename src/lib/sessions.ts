export type SessionType =
  | "panel_session"
  | "interactive_session"
  | "special_talk"
  | "special_dialogue"
  | "main_session"
  | "opening"
  | "registration"
  | "break"
  | "prayer_break"
  | "ceremony"
  | "other";

export const sessionTypeLabels: Record<SessionType, string> = {
  panel_session: "جلسة حوارية",
  interactive_session: "لقاء تفاعلي",
  special_talk: "كلمة خاصة",
  special_dialogue: "حوار خاص",
  main_session: "الجلسة الرئيسية",
  opening: "افتتاح",
  registration: "استقبال وتسجيل",
  break: "استراحة",
  prayer_break: "استراحة وصلاة",
  ceremony: "حفل",
  other: "أخرى",
};

/** أنواع لا تُعامل كجلسات متحدثين */
export const nonSpeakerTypes: SessionType[] = ["break", "prayer_break", "registration"];

export type SessionStatus =
  | "scheduled"
  | "ready"
  | "starting_soon"
  | "live"
  | "completed"
  | "delayed"
  | "cancelled";

export const sessionStatusLabels: Record<SessionStatus, string> = {
  scheduled: "مجدولة",
  ready: "جاهزة",
  starting_soon: "تبدأ قريبًا",
  live: "جارية الآن",
  completed: "انتهت",
  delayed: "متأخرة",
  cancelled: "ملغاة",
};

export type ParticipantRole =
  | "speaker"
  | "moderator"
  | "moderator_f"
  | "interviewer"
  | "interviewer_f"
  | "host"
  | "presenter"
  | "guest";

export const participantRoleLabels: Record<ParticipantRole, string> = {
  speaker: "متحدث",
  moderator: "مدير الجلسة",
  moderator_f: "مديرة الجلسة",
  interviewer: "محاور",
  interviewer_f: "محاورة",
  host: "مقدم",
  presenter: "مقدم",
  guest: "ضيف",
};

export const moderatorRoles: ParticipantRole[] = [
  "moderator",
  "moderator_f",
  "interviewer",
  "interviewer_f",
];

export const conferenceDays = [
  { date: "2026-09-06", label: "اليوم الأول", sub: "الأحد 6 سبتمبر 2026" },
  { date: "2026-09-07", label: "اليوم الثاني", sub: "الاثنين 7 سبتمبر 2026" },
  { date: "2026-09-08", label: "اليوم الثالث", sub: "الثلاثاء 8 سبتمبر 2026" },
];

/** الوقت الحالي بتوقيت الرياض على شكل تاريخ YYYY-MM-DD */
export function riyadhToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function riyadhClock(now = new Date()) {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
}

/** يحول تاريخ ووقت الجلسة (بتوقيت الرياض) إلى ms */
export function sessionMs(date?: string | null, time?: string | null) {
  if (!date || !time) return null;
  const t = time.length === 5 ? `${time}:00` : time;
  const ms = Date.parse(`${date}T${t}+03:00`);
  return Number.isNaN(ms) ? null : ms;
}

export function fmtTime(time?: string | null) {
  if (!time) return "—";
  return time.slice(0, 5);
}

export function diffMinutes(start?: string | null, end?: string | null) {
  if (!start || !end) return null;
  const [sh = NaN, sm = 0] = start.split(":").map(Number);
  const [eh = NaN, em = 0] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  return eh * 60 + em - (sh * 60 + sm);
}

export function fmtDuration(minutes?: number | null) {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} س ${m} د`;
  if (h) return `${h} ساعة`;
  return `${m} دقيقة`;
}

export function fmtCountdown(ms: number) {
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export type TimePhase =
  | { kind: "live"; remainingMs: number }
  | { kind: "ended" }
  | { kind: "upcoming"; inMs: number }
  | { kind: "unknown" };

export function timePhase(
  session: { session_date?: string | null; start_time?: string | null; end_time?: string | null },
  now: number,
): TimePhase {
  const start = sessionMs(session.session_date, session.start_time);
  const end = sessionMs(session.session_date, session.end_time);
  if (start === null) return { kind: "unknown" };
  if (now < start) return { kind: "upcoming", inMs: start - now };
  if (end !== null && now > end) return { kind: "ended" };
  if (end === null && now > start + 90 * 60_000) return { kind: "ended" };
  return { kind: "live", remainingMs: (end ?? start + 60 * 60_000) - now };
}

export function timeAlertLabel(phase: TimePhase) {
  if (phase.kind === "live") return "الجلسة جارية الآن";
  if (phase.kind === "ended") return "الجلسة انتهت";
  if (phase.kind === "upcoming") {
    const min = phase.inMs / 60_000;
    if (min <= 30) return "جلسة بعد 30 دقيقة";
    if (min <= 60) return "جلسة بعد ساعة";
    if (min <= 120) return "جلسة بعد ساعتين";
    return null;
  }
  return null;
}

/** حالة المتحدث التشغيلية */
export const opStatusLabels: Record<string, string> = {
  not_arrived: "لم يصل",
  arrived_airport: "وصل المطار",
  received: "تم الاستقبال",
  in_transport: "بالطريق للفندق",
  at_hotel: "في الفندق",
  hotel_checked_in: "تم التسكين",
  to_venue: "بالطريق للفعالية",
  at_venue: "في موقع الفعالية",
  departed: "غادر",
};

export type Readiness = {
  key: "ready" | "attention" | "risk" | "ended" | "na";
  label: string;
  hint?: string;
};

const AT_VENUE = ["at_venue", "to_venue"];
const AT_HOTEL = ["at_hotel", "hotel_checked_in", "received", "in_transport"];
const AT_AIRPORT = ["arrived_airport", "not_arrived"];

export function sessionReadiness(
  phase: TimePhase,
  statuses: (string | null | undefined)[],
): Readiness {
  if (phase.kind === "ended") return { key: "ended", label: "انتهت" };
  if (statuses.length === 0) return { key: "na", label: "بدون متحدثين مرتبطين" };
  const known = statuses.map((s) => s ?? "not_arrived");
  const allVenue = known.every((s) => AT_VENUE.includes(s));
  const anyAirport = known.some((s) => AT_AIRPORT.includes(s));
  const anyHotel = known.some((s) => AT_HOTEL.includes(s));
  const minutesToStart = phase.kind === "upcoming" ? phase.inMs / 60_000 : 0;

  if (allVenue) return { key: "ready", label: "جاهزة" };
  if (anyAirport && (phase.kind === "live" || minutesToStart <= 60))
    return { key: "risk", label: "خطر", hint: "متحدث لا يزال في المطار" };
  if (anyHotel && minutesToStart <= 120)
    return { key: "attention", label: "تحتاج انتباه", hint: "تحتاج تنسيق نقل" };
  if (anyAirport) return { key: "attention", label: "تحتاج انتباه", hint: "متحدث لم يصل بعد" };
  return { key: "attention", label: "تحتاج انتباه" };
}

export const readinessClasses: Record<Readiness["key"], string> = {
  ready: "bg-emerald-100 text-emerald-800 border-emerald-300",
  attention: "bg-amber-100 text-amber-900 border-amber-300",
  risk: "bg-red-100 text-red-800 border-red-300",
  ended: "bg-muted text-muted-foreground border-border",
  na: "bg-muted text-muted-foreground border-border",
};

export function normalizeName(value?: string | null) {
  return (value ?? "")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

export const TBD = "لم يتأكد بعد";

/** حالة مطابقة المشارك مع سجلات المتحدثين */
export type MatchStatus = "matched" | "needs_matching" | "unconfirmed";

export const matchStatusLabels: Record<MatchStatus, string> = {
  matched: "مطابق مؤكد",
  needs_matching: "بحاجة لمطابقة",
  unconfirmed: "غير مؤكد",
};

/** دقة توقيت النشاط داخل الفترة الزمنية */
export type TimePrecision = "exact" | "within_slot";

export const timePrecisionLabels: Record<TimePrecision, string> = {
  exact: "وقت محدد",
  within_slot: "ضمن الفترة الزمنية",
};
