import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Mic, Plane, BedDouble, Car, ClipboardList, Users, ShieldCheck } from "lucide-react";

import heroImage from "@/assets/hero-event.jpg";
import eventLogo from "@/assets/event-logo-2026.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "حوار الأمن والتاريخ — تنظيم متكامل وأنيق" },
      {
        name: "description",
        content:
          "بوابة إلكترونية لإدارة الفعاليات: المتحدثون، الجلسات، الدعوات، الحضور، السفر، الإقامة، النقل والطلبات.",
      },
      { property: "og:title", content: "حوار الأمن والتاريخ" },
      {
        property: "og:description",
        content: "إدارة مركزية لكل تفاصيل الفعالية من الدعوة حتى المغادرة.",
      },
    ],
  }),
  component: Landing,
});

const modules = [
  { icon: CalendarDays, title: "الفعاليات", text: "مواعيد ومواقع وحالات الفعاليات في سجل واحد." },
  { icon: Mic, title: "المتحدثون والجلسات", text: "سِيَر المتحدثين وجدول الجلسات والقاعات." },
  { icon: Users, title: "الدعوات والحضور", text: "إرسال الدعوات ومتابعة الردود وتسجيل الحضور." },
  { icon: Plane, title: "السفر", text: "رحلات الطيران ومواعيد الوصول والمغادرة." },
  { icon: BedDouble, title: "الإقامة", text: "الفنادق والغرف والحجوزات لكل متحدث." },
  { icon: Car, title: "النقل", text: "السائقون والمركبات وجدولة التنقلات." },
  { icon: ClipboardList, title: "الطلبات", text: "طلبات المتحدثين بتصنيفات وأولويات وحالات." },
  { icon: ShieldCheck, title: "الصلاحيات", text: "مدير، منسّق، ومطّلع بصلاحيات دقيقة وآمنة." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <img
          src={eventLogo.url}
          alt="شعار مؤتمر حوار الأمن والتاريخ — الرياض 2026"
          className="h-14 w-auto rounded-lg object-contain"
        />

        <Link
          to="/auth"
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          دخول البوابة
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:py-16">
        <div>
          <span className="inline-block rounded-full bg-secondary px-4 py-1 text-xs font-medium text-secondary-foreground">
            نظام تشغيل الفعاليات
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-foreground lg:text-5xl">
            كل تفاصيل فعاليتك
            <span className="text-primary"> منظّمة</span> في بوابة واحدة
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            من استقبال المتحدث في المطار، إلى غرفة الفندق، إلى منصّة الجلسة — تابع كل خطوة بواجهة
            عربية أنيقة وصلاحيات واضحة لفريقك.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              ابدأ الآن
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              لوحة التحكم
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl" style={{ boxShadow: "var(--shadow-soft)" }}>
          <img
            src={heroImage}
            alt="قاعة فعاليات فاخرة بألوان زمردية وذهبية"
            width={1600}
            height={1000}
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14">
        <h2 className="font-display text-2xl font-bold text-foreground">وحدات البوابة</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div key={m.title} className="surface-card p-6">
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                <m.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-bold text-foreground">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          حوار الأمن والتاريخ © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
