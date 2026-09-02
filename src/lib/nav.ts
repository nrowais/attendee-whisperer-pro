import {
  Activity,
  UserCheck,
  Mic2,
  Plane,
  PlaneLanding,
  BedDouble,
  BarChart3,
  CalendarDays,
  ClipboardPlus,
  Car,
  Ticket,
  ListChecks,
  Sheet,
  Settings,

  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; hint?: string; adminOnly?: boolean };

export const navItems: NavItem[] = [
  { to: "/dashboard", label: "المتابعة اللحظية", icon: Activity, hint: "الأرقام والحالة الآن" },
  { to: "/calendar", label: "التقويم", icon: CalendarDays, hint: "كل المواعيد في شهر واحد" },
  { to: "/daily", label: "الإدخال اليومي", icon: ClipboardPlus, hint: "نقل وإقامة يوماً بيوم" },

  { to: "/operations", label: "الحالة التشغيلية", icon: ListChecks, hint: "تسجيل الوصول والنقل والفندق والمغادرة" },
  
  { to: "/speakers", label: "المتحدثون", icon: Mic2, hint: "المتحدثون والجلسات والطلبات" },
  { to: "/invitees", label: "الضيوف والمدعوون", icon: UserCheck, hint: "المدعوون والدعوات والحضور" },
  { to: "/movements", label: "التنقلات", icon: Plane, hint: "الطيران والوصول والنقل الأرضي" },
  { to: "/reception", label: "مركز الرحلات والاستقبال", icon: PlaneLanding, hint: "مركز عمليات الوصول ومتابعة رحلات المتحدثين" },
  { to: "/airport", label: "شاشة المطار", icon: Plane, hint: "متابعة حالة الرحلات والتأخيرات" },
  { to: "/fleet", label: "السائقون والمركبات", icon: Car, hint: "الأسطول وتوزيع رحلات الوصول والمغادرة" },
  { to: "/tickets", label: "تذاكر النقل", icon: Ticket, hint: "ربط السائق والمركبة بالرحلة المجدولة والفعلية" },
  { to: "/hotels", label: "الإقامة", icon: BedDouble, hint: "الفنادق والغرف والحجوزات" },
  { to: "/reports", label: "التقارير", icon: BarChart3, hint: "ملخصات قابلة للتصدير" },
  { to: "/sheets", label: "استيراد من Google Sheets", icon: Sheet, hint: "رفع ملف xlsx أو csv وإدخال بياناته للبوابة", adminOnly: true },
  { to: "/settings", label: "الإعدادات", icon: Settings, hint: "الفعالية والفريق والصلاحيات" },

];

export const eventName = "مؤتمر حوار الأمن والتاريخ — الرياض 2026";
