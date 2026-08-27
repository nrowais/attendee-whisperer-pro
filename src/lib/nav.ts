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
  CalendarDays,
  Presentation,
  MailOpen,
  Ticket,
  PlaneLanding,
  DoorOpen,
  Hotel,
  KeyRound,
  IdCard,
  Tags,
  CalendarClock,
  Bell,
  History,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export const navItems: NavItem[] = [
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/overview", label: "شاشة المتابعة", icon: Activity },
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

export const navGroups: NavGroup[] = [
  { label: "العمليات", items: navItems },
  {
    label: "الفعاليات والدعوات",
    items: [
      { to: "/events", label: "الفعاليات", icon: CalendarDays },
      { to: "/sessions", label: "جلسات المتحدثين", icon: Presentation },
      { to: "/invitations", label: "الدعوات", icon: MailOpen },
      { to: "/categories", label: "تصنيفات الطلبات", icon: Tags },
    ],
  },
  {
    label: "السفر والإقامة",
    items: [
      { to: "/flights", label: "الرحلات الجوية", icon: Ticket },
      { to: "/arrivals", label: "سجل الوصول", icon: PlaneLanding },
      { to: "/departures", label: "سجل المغادرة", icon: DoorOpen },
      { to: "/rooms", label: "غرف الفنادق", icon: Hotel },
      { to: "/bookings", label: "حجوزات الإقامة", icon: KeyRound },
    ],
  },
  {
    label: "الموارد والفريق",
    items: [
      { to: "/drivers", label: "السائقون", icon: IdCard },
      { to: "/vehicles", label: "المركبات", icon: Car },
      { to: "/assignments", label: "مهام الفريق", icon: CalendarClock },
    ],
  },
  {
    label: "النظام",
    items: [
      { to: "/activity", label: "سجل النشاط", icon: History },
      { to: "/notifications", label: "الإشعارات", icon: Bell },
      { to: "/users", label: "المستخدمون والصلاحيات", icon: ShieldCheck },
    ],
  },
];

export const eventName = "منتدى الرياض الدولي 2026";
