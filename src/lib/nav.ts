import {
  Activity,
  UserCheck,
  Mic2,
  BarChart3,
  Settings,
  ListChecks,
  Sunrise,
  PlaneLanding,
  Car,
  BedDouble,
  PlaneTakeoff,
  Inbox,
  Loader,
  CheckCircle2,
  Mail,
  User,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  hint?: string;
  children?: NavItem[];
};

export const navItems: NavItem[] = [
  { to: "/dashboard", label: "لوحة غرفة العمليات", icon: Activity, hint: "الأرقام والحالة الآن" },
  {
    to: "/speakers",
    label: "المتحدثون",
    icon: Mic2,
    hint: "القائمة ولوحة الحالات",
    children: [{ to: "/speakers", label: "ملف المتحدث", icon: User }],
  },
  {
    to: "/invitees",
    label: "المدعوون",
    icon: UserCheck,
    hint: "قائمة المدعوين",
    children: [{ to: "/invitees/invitations", label: "الدعوات والحضور", icon: Mail }],
  },
  {
    to: "/operations",
    label: "العمليات",
    icon: ListChecks,
    hint: "تسجيل الحركة لحظياً",
    children: [
      { to: "/ops/today", label: "عمليات اليوم", icon: Sunrise },
      { to: "/ops/incoming", label: "القادمون", icon: PlaneLanding },
      { to: "/ops/airport", label: "الموجودون بالمطار", icon: PlaneLanding },
      { to: "/ops/transport", label: "النقل", icon: Car },
      { to: "/ops/hotel", label: "الفندق", icon: BedDouble },
      { to: "/ops/departing", label: "المغادرون", icon: PlaneTakeoff },
    ],
  },
  {
    to: "/requests/new",
    label: "الطلبات",
    icon: Inbox,
    hint: "طلبات المتحدثين",
    children: [
      { to: "/requests/new", label: "جديدة", icon: Inbox },
      { to: "/requests/in-progress", label: "جاري التنفيذ", icon: Loader },
      { to: "/requests/done", label: "مكتملة", icon: CheckCircle2 },
    ],
  },
  { to: "/reports", label: "التقارير", icon: BarChart3, hint: "ملخصات قابلة للتصدير" },
  { to: "/settings", label: "الإعدادات", icon: Settings, hint: "الفعالية والفريق والصلاحيات" },
];

export const eventName = "مؤتمر حوار الأمن والتاريخ — الرياض 2026";
