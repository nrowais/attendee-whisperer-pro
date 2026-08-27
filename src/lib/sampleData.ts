export type ArrivalStatus =
  | "في الجو"
  | "هبطت الرحلة"
  | "في المطار"
  | "بالطريق"
  | "في الفندق"
  | "في موقع الفعالية"
  | "غادر";

export type UpcomingArrival = {
  id: string;
  name: string;
  photo: string;
  flight: string;
  arrivalTime: string;
  airport: string;
  greeter: string;
  driver: string;
  status: ArrivalStatus;
};

export const speakerKpis = [
  { key: "total", label: "إجمالي المتحدثين", value: 180, tone: "primary" as const },
  { key: "arrived", label: "وصلوا", value: 112, tone: "success" as const },
  { key: "pending", label: "لم يصلوا", value: 68, tone: "muted" as const },
  { key: "airport", label: "في المطار", value: 9, tone: "info" as const },
  { key: "enroute", label: "بالطريق", value: 14, tone: "warning" as const },
  { key: "hotel", label: "في الفندق", value: 63, tone: "info" as const },
  { key: "venue", label: "في موقع الفعالية", value: 26, tone: "success" as const },
  { key: "departed", label: "غادروا", value: 18, tone: "muted" as const },
];

export const guestKpis = [
  { key: "invited", label: "إجمالي المدعوين", value: 1000, tone: "primary" as const },
  { key: "confirmed", label: "أكد الحضور", value: 642, tone: "success" as const },
  { key: "declined", label: "اعتذر", value: 133, tone: "danger" as const },
  { key: "noreply", label: "لم يرد", value: 225, tone: "muted" as const },
  { key: "attended", label: "حضر فعلياً", value: 498, tone: "info" as const },
];

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;

export const upcomingArrivals: UpcomingArrival[] = [
  {
    id: "1",
    name: "د. سلطان الغامدي",
    photo: avatar("SG"),
    flight: "SV 1042",
    arrivalTime: "اليوم 14:35",
    airport: "مطار الملك خالد الدولي",
    greeter: "نورة العتيبي",
    driver: "فهد الشمري",
    status: "في الجو",
  },
  {
    id: "2",
    name: "أ. ليلى المنصور",
    photo: avatar("LM"),
    flight: "EK 819",
    arrivalTime: "اليوم 15:10",
    airport: "مطار الملك خالد الدولي",
    greeter: "عبدالله القحطاني",
    driver: "ماجد الدوسري",
    status: "هبطت الرحلة",
  },
  {
    id: "3",
    name: "Prof. Daniel Reyes",
    photo: avatar("DR"),
    flight: "LH 630",
    arrivalTime: "اليوم 16:05",
    airport: "مطار الملك خالد الدولي",
    greeter: "ريم الحربي",
    driver: "سعد المطيري",
    status: "في المطار",
  },
  {
    id: "4",
    name: "د. هند الزهراني",
    photo: avatar("HZ"),
    flight: "MS 671",
    arrivalTime: "اليوم 17:20",
    airport: "مطار الملك خالد الدولي",
    greeter: "خالد السبيعي",
    driver: "تركي العنزي",
    status: "بالطريق",
  },
  {
    id: "5",
    name: "م. يوسف بن عمر",
    photo: avatar("YO"),
    flight: "QR 1128",
    arrivalTime: "اليوم 18:45",
    airport: "مطار الملك خالد الدولي",
    greeter: "منى الصالح",
    driver: "بندر الرشيد",
    status: "في الفندق",
  },
  {
    id: "6",
    name: "Dr. Amina Kone",
    photo: avatar("AK"),
    flight: "TK 144",
    arrivalTime: "غداً 08:30",
    airport: "مطار الملك خالد الدولي",
    greeter: "سارة الفهد",
    driver: "نايف البقمي",
    status: "في الجو",
  },
];

export type ActivityKind = "وصول متحدث" | "هبوط رحلة" | "وصول الفندق" | "بدء رحلة سيارة" | "تنفيذ طلب خاص";

export const recentActivities: { id: string; kind: ActivityKind; detail: string; time: string }[] = [
  { id: "a1", kind: "هبوط رحلة", detail: "هبطت الرحلة EK 819 قادمة من دبي", time: "قبل 4 دقائق" },
  { id: "a2", kind: "وصول متحدث", detail: "وصول Prof. Daniel Reyes إلى صالة كبار الشخصيات", time: "قبل 12 دقيقة" },
  { id: "a3", kind: "بدء رحلة سيارة", detail: "انطلاق السائق تركي العنزي إلى فندق الفيصلية", time: "قبل 21 دقيقة" },
  { id: "a4", kind: "وصول الفندق", detail: "تسجيل دخول م. يوسف بن عمر — غرفة 1204", time: "قبل 38 دقيقة" },
  { id: "a5", kind: "تنفيذ طلب خاص", detail: "تم توفير مترجم فوري للدكتورة Amina Kone", time: "قبل 54 دقيقة" },
  { id: "a6", kind: "وصول متحدث", detail: "وصول د. هند الزهراني إلى موقع الفعالية", time: "قبل ساعة" },
];
