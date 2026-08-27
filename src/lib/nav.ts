export type NavItem = { to: string; label: string };
export type NavGroup = { title: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
  {
    title: "نظرة عامة",
    items: [
      { to: "/dashboard", label: "لوحة التحكم" },
      { to: "/events", label: "الفعاليات" },
    ],
  },
  {
    title: "المتحدثون",
    items: [
      { to: "/speakers", label: "المتحدثون" },
      { to: "/sessions", label: "الجلسات" },
      { to: "/requests", label: "طلبات المتحدثين" },
      { to: "/categories", label: "تصنيفات الطلبات" },
    ],
  },
  {
    title: "الدعوات والحضور",
    items: [
      { to: "/invitees", label: "المدعوون" },
      { to: "/invitations", label: "الدعوات" },
      { to: "/attendance", label: "الحضور" },
    ],
  },
  {
    title: "السفر والإقامة",
    items: [
      { to: "/flights", label: "الرحلات الجوية" },
      { to: "/arrivals", label: "الوصول" },
      { to: "/departures", label: "المغادرة" },
      { to: "/hotels", label: "الفنادق" },
      { to: "/rooms", label: "الغرف" },
      { to: "/bookings", label: "حجوزات الفنادق" },
    ],
  },
  {
    title: "النقل",
    items: [
      { to: "/drivers", label: "السائقون" },
      { to: "/vehicles", label: "المركبات" },
      { to: "/trips", label: "رحلات النقل" },
    ],
  },
  {
    title: "الفريق والإدارة",
    items: [
      { to: "/staff", label: "الموظفون" },
      { to: "/assignments", label: "التكليفات" },
      { to: "/notifications", label: "الإشعارات" },
      { to: "/users", label: "المستخدمون والصلاحيات" },
    ],
  },
];
