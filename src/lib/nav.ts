import {
  Activity,
  Users,
  Plane,
  BedDouble,
  BarChart3,
  CalendarDays,
  ClipboardPlus,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; hint?: string };

export const navItems: NavItem[] = [
  { to: "/dashboard", label: "المتابعة اللحظية", icon: Activity, hint: "الأرقام والحالة الآن" },
  { to: "/calendar", label: "التقويم", icon: CalendarDays, hint: "كل المواعيد في شهر واحد" },
  { to: "/daily", label: "الإدخال اليومي", icon: ClipboardPlus, hint: "نقل وإقامة يوماً بيوم" },

  { to: "/speakers", label: "الضيوف والمتحدثون", icon: Users, hint: "المتحدثون والمدعوون والحضور" },
  { to: "/movements", label: "التنقلات", icon: Plane, hint: "الطيران والوصول والنقل الأرضي" },
  { to: "/hotels", label: "الإقامة", icon: BedDouble, hint: "الفنادق والغرف والحجوزات" },
  { to: "/reports", label: "التقارير", icon: BarChart3, hint: "ملخصات قابلة للتصدير" },
  { to: "/settings", label: "الإعدادات", icon: Settings, hint: "الفعالية والفريق والصلاحيات" },
];

export const eventName = "مؤتمر حوار الأمن والتاريخ — الرياض 2026";
