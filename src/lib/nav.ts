import {
  LayoutDashboard,
  Mic,
  Users,
  PlaneTakeoff,
  Plane,
  Car,
  BedDouble,
  ClipboardList,
  UserCheck,
  UsersRound,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon };

export const navItems: NavItem[] = [
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/speakers", label: "المتحدثون", icon: Mic },
  { to: "/invitees", label: "المدعوون", icon: Users },
  { to: "/movements", label: "الوصول والمغادرة", icon: PlaneTakeoff },
  { to: "/airport", label: "المطار", icon: Plane },
  { to: "/trips", label: "النقل والسيارات", icon: Car },
  { to: "/hotels", label: "الفنادق والسكن", icon: BedDouble },
  { to: "/requests", label: "الطلبات الخاصة", icon: ClipboardList },
  { to: "/attendance", label: "الحضور والتسجيل", icon: UserCheck },
  { to: "/staff", label: "فريق العمل", icon: UsersRound },
  { to: "/reports", label: "التقارير", icon: BarChart3 },
  { to: "/settings", label: "الإعدادات", icon: Settings },
];

export const eventName = "منتدى الرياض الدولي 2026";
