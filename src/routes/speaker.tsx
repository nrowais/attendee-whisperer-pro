import { createFileRoute } from "@tanstack/react-router";
import {
  User,
  Plane,
  BedDouble,
  Car,
  CalendarClock,
  ClipboardList,
  MapPin,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogOut,
  QrCode,
  Mic,
} from "lucide-react";

import heroImage from "@/assets/hero-event.jpg";
import { eventName } from "@/lib/nav";

export const Route = createFileRoute("/speaker")({
  head: () => ({
    meta: [
      { title: "حساب المتحدث — حوار الأمن والتاريخ" },
      { name: "description", content: "بوابة المتحدث الشخصية لمتابعة الرحلات والإقامة والجلسات والطلبات." },
      { property: "og:title", content: "حساب المتحدث — حوار الأمن والتاريخ" },
      { property: "og:description", content: "بوابة المتحدث الشخصية لمتابعة الفعالية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpeakerPortal,
});

const speaker = {
  name: "د. سلطان الغامدي",
  title: "أستاذ الذكاء الاصطناعي",
  org: "جامعة الملك سعود",
  country: "السعودية",
  photo: "https://api.dicebear.com/7.x/initials/svg?seed=SG&backgroundType=gradientLinear",
  bio: "باحث متخصص في تطبيقات الذكاء الاصطناعي في المدن الذكية والبنية التحتية الرقمية.",
  email: "s.alghamdi@ksu.edu.sa",
  phone: "+966 50 123 4567",
  badge: "SPK-0012",
  status: "في الجو",
  eventName,
};

const flight = {
  airline: "الخطوط السعودية",
  number: "SV 1042",
  origin: "جدة",
  destination: "الرياض",
  departure: "اليوم 13:20",
  arrival: "اليوم 14:35",
  gate: "البوابة 18",
  terminal: "المحطة 1",
};

const hotel = {
  name: "فندق الفيصلية",
  room: "1204",
  type: "جناح تنفيذي",
  checkIn: "10 نوفمبر",
  checkOut: "13 نوفمبر",
  address: "طريق الملك فهد، الرياض",
};

const trips = [
  { id: "tr1", type: "استقبال من المطار", from: "مطار الملك خالد", to: "فندق الفيصلية", time: "اليوم 14:50", driver: "فهد الشمري", vehicle: "GMC يوكن — ر ط ن 4412", status: "مجدولة" },
  { id: "tr2", type: "الفعالية — اليوم الأول", from: "فندق الفيصلية", to: "مركز الملك عبدالعزيز للمؤتمرات", time: "11 نوفمبر 08:30", driver: "سعد المطيري", vehicle: "مرسيدس S500 — أ ب ج 2210", status: "مجدولة" },
];

const session = {
  title: "مستقبل المدن الذكية",
  hall: "قاعة الزمردة",
  date: "11 نوفمبر 2026",
  time: "10:30 – 11:15",
  role: "متحدث رئيسي",
};

const requests = [
  { id: "rq1", title: "سيارة مخصصة للتنقل", status: "قيد التنفيذ", priority: "متوسطة" },
  { id: "rq2", title: "شاشة عرض إضافية", status: "منفذ", priority: "منخفضة" },
];

const timeline = [
  { id: 1, label: "إصدار دعوة الفعالية", time: "20 أكتوبر", done: true },
  { id: 2, label: "تأكيد تفاصيل السفر", time: "28 أكتوبر", done: true },
  { id: 3, label: "حجز الفندق والنقل", time: "02 نوفمبر", done: true },
  { id: 4, label: "الوصول إلى الرياض", time: "اليوم 14:35", done: false, current: true },
  { id: 5, label: "الجلسة الافتتاحية", time: "11 نوفمبر 10:30", done: false },
  { id: 6, label: "المغادرة", time: "13 نوفمبر 16:00", done: false },
];

function StatusBadge({ label, tone }: { label: string; tone: "success" | "warning" | "info" | "muted" }) {
  const map = {
    success: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    warning: "bg-amber-100 text-amber-800 ring-amber-200",
    info: "bg-sky-100 text-sky-800 ring-sky-200",
    muted: "bg-slate-100 text-slate-700 ring-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${map[tone]}`}>
      <span className={`size-1.5 rounded-full ${tone === "success" ? "bg-emerald-600" : tone === "warning" ? "bg-amber-600" : tone === "info" ? "bg-sky-600" : "bg-slate-500"}`} />
      {label}
    </span>
  );
}

function Card({ icon: Icon, title, children, accent = false }: { icon: typeof User; title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${accent ? "ring-1 ring-primary/20" : ""}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex size-10 items-center justify-center rounded-xl ${accent ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
          <Icon className="size-5" />
        </span>
        <h2 className="font-display text-base font-bold text-card-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-card-foreground">{value}</p>
    </div>
  );
}

function SpeakerPortal() {
  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mic className="size-5" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-card-foreground">{speaker.eventName}</p>
              <p className="text-[10px] text-muted-foreground">بوابة المتحدث</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">الأربعاء، 10 نوفمبر 2026</span>
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5">
              <img src={speaker.photo} alt={speaker.name} className="size-7 rounded-full border border-border object-cover" />
              <span className="hidden text-xs font-medium sm:inline">{speaker.name}</span>
            </div>
            <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary" aria-label="خروج">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <div className="relative h-40 overflow-hidden sm:h-56">
        <img src={heroImage} alt="خلفية الفعالية" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-6xl px-4 pb-4 sm:pb-6">
          <div className="flex items-end gap-4">
            <img
              src={speaker.photo}
              alt={speaker.name}
              className="size-20 rounded-2xl border-4 border-background bg-white object-cover shadow-lg sm:size-28"
            />
            <div className="mb-1">
              <h1 className="font-display text-xl font-bold text-foreground sm:text-3xl">{speaker.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{speaker.title} · {speaker.org}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge label={speaker.status} tone="info" />
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  <QrCode className="size-3.5" />
                  {speaker.badge}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Welcome + quick actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-semibold text-foreground">مرحباً بك في {eventName}</p>
            <p className="text-sm text-muted-foreground">هنا تجد جدولك، تفاصيل سفرك، إقامتك، وكل طلباتك.</p>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <CalendarClock className="size-4" />
              إضافة للتقويم
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary">
              <Phone className="size-4" />
              الاتصال بالمنسق
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-5 lg:col-span-2">
            <Card icon={Plane} title="تفاصيل الرحلة" accent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/50 p-4">
                  <p className="text-xs text-muted-foreground">رقم الرحلة</p>
                  <p className="text-2xl font-bold text-primary">{flight.number}</p>
                  <p className="text-sm text-muted-foreground">{flight.airline}</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-4">
                  <p className="text-xs text-muted-foreground">حالة الوصول</p>
                  <p className="text-lg font-bold text-info">في الجو</p>
                  <p className="text-sm text-muted-foreground">الوصول المتوقع: {flight.arrival}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-y-3 sm:grid-cols-3">
                <Field label="المغادرة" value={`${flight.origin} · ${flight.departure}`} />
                <Field label="الوجهة" value={`${flight.destination} · ${flight.arrival}`} />
                <Field label="البوابة / المحطة" value={`${flight.gate} · ${flight.terminal}`} />
              </div>
            </Card>

            <Card icon={Car} title="حركات النقل">
              <div className="space-y-3">
                {trips.map((t) => (
                  <div key={t.id} className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-card-foreground">{t.type}</p>
                        <StatusBadge label={t.status} tone={t.status === "مكتملة" ? "success" : t.status === "جارية" ? "warning" : "info"} />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {t.from} <ArrowRight className="size-3.5" /> {t.to}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{t.driver} · {t.vehicle}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-card-foreground">{t.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card icon={ClipboardList} title="طلباتي الخاصة">
              <div className="space-y-3">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex size-8 items-center justify-center rounded-lg ${r.status === "منفذ" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.status === "منفذ" ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                      </span>
                      <p className="text-sm font-medium text-card-foreground">{r.title}</p>
                    </div>
                    <StatusBadge label={r.status} tone={r.status === "منفذ" ? "success" : "warning"} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <Card icon={CalendarClock} title="جلساتي">
              <div className="rounded-xl border border-border p-4">
                <p className="font-display text-base font-bold text-card-foreground">{session.title}</p>
                <p className="mt-1 text-sm text-primary">{session.role}</p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2"><Clock className="size-4" /> {session.date} · {session.time}</p>
                  <p className="flex items-center gap-2"><MapPin className="size-4" /> {session.hall}</p>
                </div>
              </div>
            </Card>

            <Card icon={BedDouble} title="الإقامة">
              <div className="rounded-xl border border-border p-4">
                <p className="font-display text-base font-bold text-card-foreground">{hotel.name}</p>
                <p className="text-sm text-muted-foreground">{hotel.address}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field label="الغرفة" value={hotel.room} />
                  <Field label="النوع" value={hotel.type} />
                  <Field label="تسجيل الدخول" value={hotel.checkIn} />
                  <Field label="تسجيل الخروج" value={hotel.checkOut} />
                </div>
              </div>
            </Card>

            <Card icon={User} title="معلومات التواصل">
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-2 text-card-foreground"><Mail className="size-4 text-primary" /> {speaker.email}</p>
                <p className="flex items-center gap-2 text-card-foreground"><Phone className="size-4 text-primary" /> {speaker.phone}</p>
              </div>
            </Card>

            <Card icon={AlertCircle} title="مساعدة سريعة">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>منسّقك: <span className="font-medium text-card-foreground">ريم الحربي</span></p>
                <p>غرفة العمليات: <span className="font-medium text-card-foreground">9200 11234</span></p>
              </div>
              <button className="mt-4 w-full rounded-lg border border-border bg-card py-2 text-sm font-medium text-card-foreground hover:bg-secondary">
                فتح المحادثة
              </button>
            </Card>
          </div>
        </div>

        {/* Timeline */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-5 font-display text-base font-bold text-card-foreground">الجدول الزمني</h2>
          <div className="relative">
            <div className="absolute right-3.5 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-6">
              {timeline.map((item) => (
                <div key={item.id} className="relative flex items-start gap-4 pr-8">
                  <span
                    className={`absolute right-2 top-1 size-3 rounded-full border-2 border-background ${
                      item.done ? "bg-emerald-500" : item.current ? "bg-primary ring-4 ring-primary/20" : "bg-slate-300"
                    }`}
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-semibold ${item.done || item.current ? "text-card-foreground" : "text-muted-foreground"}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
