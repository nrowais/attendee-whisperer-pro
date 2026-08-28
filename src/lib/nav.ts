import {
  Activity,
  Mic,
  Users,
  Plane,
  Car,
  BedDouble,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; hint?: string };

export const navItems: NavItem[] = [
  { to: "/dashboard", label: "المتابعة اللحظية", icon: Activity, hint: "الأرقام والحالة الآن" },
  { to: "/speakers", label: "المتحدثون", icon: Mic, hint: "البيانات والجلسات والطلبات" },
  { to: "/invitees", label: "المدعوون والحضور", icon: Users, hint: "الدعوات والتسجيل" },
  { to: "/movements", label: "السفر والتحركات", icon: Plane, hint: "الرحلات والوصول والمغادرة" },
  { to: "/trips", label: "النقل الأرضي", icon: Car, hint: "الرحلات والسائقون والمركبات" },
  { to: "/hotels", label: "الإقامة", icon: BedDouble, hint: "الفنادق والغرف والحجوزات" },
  { to: "/reports", label: "التقارير", icon: BarChart3, hint: "ملخصات قابلة للتصدير" },
  { to: "/settings", label: "الإعدادات", icon: Settings, hint: "الفعالية والفريق والصلاحيات" },
];

export const eventName = "مؤتمر حوار الأمن والتاريخ — الرياض 2026";
