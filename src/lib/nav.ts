import {
  Activity,
  UserCheck,
  Mic2,
  Plane,
  BarChart3,
  CalendarDays,
  ClipboardPlus,
  Car,
  Ticket,
  ListChecks,
  LayoutList,
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
  
  { to: "/sessions", label: "خريطة الجلسات", icon: LayoutList, hint: "الخريطة الزمنية للمسارين والجاهزية" },
  { to: "/speakers", label: "المتحدثون", icon: Mic2, hint: "المتحدثون والجلسات والطلبات" },
  { to: "/invitees", label: "الضيوف والمدعوون", icon: UserCheck, hint: "المدعوون والدعوات والحضور" },
  { to: "/movements", label: "التنقلات", icon: Plane, hint: "الطيران والوصول والنقل الأرضي" },
  { to: "/fleet", label: "السائقون والمركبات", icon: Car, hint: "الأسطول وتوزيع رحلات الوصول والمغادرة" },
  { to: "/tickets", label: "تذاكر النقل", icon: Ticket, hint: "ربط السائق والمركبة بالرحلة المجدولة والفعلية" },
  { to: "/reports", label: "التقارير", icon: BarChart3, hint: "ملخصات قابلة للتصدير" },
  { to: "/sheets", label: "استيراد من Google Sheets", icon: Sheet, hint: "رفع ملف xlsx أو csv وإدخال بياناته للبوابة", adminOnly: true },
  { to: "/settings", label: "الإعدادات", icon: Settings, hint: "الفعالية والفريق والصلاحيات" },

];

export const eventName = "مؤتمر حوار الأمن والتاريخ — الرياض 2026";
