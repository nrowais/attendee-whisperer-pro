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

/* ---------- بيانات تجريبية لأقسام البوابة ---------- */

export type SpeakerRow = {
  id: string;
  name: string;
  photo: string;
  title: string;
  org: string;
  country: string;
  session: string;
  status: "لم يصل" | "في المطار" | "بالطريق" | "في الفندق" | "في موقع الفعالية" | "غادر";
};

const av = (s: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s)}&backgroundType=gradientLinear`;

export const speakerRows: SpeakerRow[] = [
  { id: "s1", name: "د. سلطان الغامدي", photo: av("SG"), title: "أستاذ الذكاء الاصطناعي", org: "جامعة الملك سعود", country: "السعودية", session: "مستقبل المدن الذكية", status: "لم يصل" },
  { id: "s2", name: "أ. ليلى المنصور", photo: av("LM"), title: "رئيس الابتكار", org: "مجموعة أفق", country: "الإمارات", session: "الاقتصاد الرقمي", status: "في المطار" },
  { id: "s3", name: "Prof. Daniel Reyes", photo: av("DR"), title: "Research Director", org: "MIT Media Lab", country: "الولايات المتحدة", session: "Human-Centered AI", status: "بالطريق" },
  { id: "s4", name: "د. هند الزهراني", photo: av("HZ"), title: "استشاري سياسات صحية", org: "وزارة الصحة", country: "السعودية", session: "الصحة الرقمية", status: "في الفندق" },
  { id: "s5", name: "م. يوسف بن عمر", photo: av("YO"), title: "رئيس تقنية", org: "شركة بُنيان", country: "قطر", session: "البنية التحتية السحابية", status: "في موقع الفعالية" },
  { id: "s6", name: "Dr. Amina Kone", photo: av("AK"), title: "Climate Economist", org: "UNDP", country: "فرنسا", session: "التحول الأخضر", status: "لم يصل" },
  { id: "s7", name: "أ. مشاري العتيبي", photo: av("MA"), title: "مدير استثمار", org: "صندوق النماء", country: "السعودية", session: "تمويل الشركات الناشئة", status: "غادر" },
  { id: "s8", name: "Dr. Sofia Bianchi", photo: av("SB"), title: "Urban Designer", org: "Politecnico di Milano", country: "إيطاليا", session: "تصميم المساحات العامة", status: "في الفندق" },
];

export type InviteeRow = {
  id: string;
  name: string;
  org: string;
  category: "شخصية رسمية" | "قطاع خاص" | "إعلام" | "أكاديمي";
  email: string;
  phone: string;
  status: "أكد الحضور" | "اعتذر" | "لم يرد";
};

export const inviteeRows: InviteeRow[] = [
  { id: "g1", name: "م. عبدالعزيز الشهري", org: "وزارة الاتصالات", category: "شخصية رسمية", email: "a.alshehri@gov.sa", phone: "0555 120 334", status: "أكد الحضور" },
  { id: "g2", name: "أ. ريما الدوسري", org: "قناة الاقتصادية", category: "إعلام", email: "rima@aleqt.sa", phone: "0533 887 210", status: "أكد الحضور" },
  { id: "g3", name: "م. تركي القحطاني", org: "شركة تقنية المستقبل", category: "قطاع خاص", email: "turki@futuretech.sa", phone: "0501 442 909", status: "لم يرد" },
  { id: "g4", name: "د. نوف السبيعي", org: "جامعة الأميرة نورة", category: "أكاديمي", email: "n.alsubaie@pnu.edu.sa", phone: "0544 771 002", status: "اعتذر" },
  { id: "g5", name: "أ. فيصل الحربي", org: "مجموعة الرياض القابضة", category: "قطاع خاص", email: "faisal@rhg.sa", phone: "0566 330 118", status: "أكد الحضور" },
  { id: "g6", name: "أ. سارة العنزي", org: "صحيفة اليوم", category: "إعلام", email: "sara@alyaum.sa", phone: "0577 909 445", status: "لم يرد" },
  { id: "g7", name: "د. ماجد الرشيد", org: "هيئة البيانات والذكاء الاصطناعي", category: "شخصية رسمية", email: "m.alrashid@sdaia.gov.sa", phone: "0509 111 663", status: "أكد الحضور" },
];

export type AttendanceRow = {
  id: string;
  name: string;
  type: "متحدث" | "مدعو" | "إعلام";
  badge: string;
  gate: "البوابة الرئيسية" | "بوابة كبار الشخصيات" | "بوابة الإعلام";
  checkIn: string;
  status: "حضر" | "لم يسجل";
};

export const attendanceRows: AttendanceRow[] = [
  { id: "at1", name: "م. يوسف بن عمر", type: "متحدث", badge: "SPK-0045", gate: "بوابة كبار الشخصيات", checkIn: "09:12", status: "حضر" },
  { id: "at2", name: "م. عبدالعزيز الشهري", type: "مدعو", badge: "GST-0312", gate: "البوابة الرئيسية", checkIn: "09:26", status: "حضر" },
  { id: "at3", name: "أ. ريما الدوسري", type: "إعلام", badge: "MED-0071", gate: "بوابة الإعلام", checkIn: "09:31", status: "حضر" },
  { id: "at4", name: "د. هند الزهراني", type: "متحدث", badge: "SPK-0022", gate: "بوابة كبار الشخصيات", checkIn: "—", status: "لم يسجل" },
  { id: "at5", name: "أ. فيصل الحربي", type: "مدعو", badge: "GST-0518", gate: "البوابة الرئيسية", checkIn: "10:04", status: "حضر" },
  { id: "at6", name: "أ. سارة العنزي", type: "إعلام", badge: "MED-0090", gate: "بوابة الإعلام", checkIn: "—", status: "لم يسجل" },
];

export type StaffRow = {
  id: string;
  name: string;
  role: "مسؤول استقبال" | "منسق نقل" | "منسق إقامة" | "منسق متحدثين" | "دعم تشغيلي";
  zone: "المطار" | "الفندق" | "موقع الفعالية" | "غرفة العمليات";
  phone: string;
  shift: "صباحي" | "مسائي";
  status: "متاح" | "في مهمة" | "خارج الدوام";
};

export const staffRows: StaffRow[] = [
  { id: "st1", name: "نورة العتيبي", role: "مسؤول استقبال", zone: "المطار", phone: "0551 220 114", shift: "صباحي", status: "في مهمة" },
  { id: "st2", name: "عبدالله القحطاني", role: "مسؤول استقبال", zone: "المطار", phone: "0553 771 208", shift: "صباحي", status: "متاح" },
  { id: "st3", name: "ريم الحربي", role: "منسق متحدثين", zone: "موقع الفعالية", phone: "0509 664 331", shift: "مسائي", status: "متاح" },
  { id: "st4", name: "خالد السبيعي", role: "منسق نقل", zone: "غرفة العمليات", phone: "0566 118 990", shift: "صباحي", status: "في مهمة" },
  { id: "st5", name: "منى الصالح", role: "منسق إقامة", zone: "الفندق", phone: "0544 330 887", shift: "مسائي", status: "متاح" },
  { id: "st6", name: "بندر الرشيد", role: "دعم تشغيلي", zone: "موقع الفعالية", phone: "0577 442 116", shift: "مسائي", status: "خارج الدوام" },
];

export type RequestRow = {
  id: string;
  guest: string;
  category: "تغذية" | "نقل خاص" | "ترجمة" | "تجهيزات تقنية" | "احتياج طبي";
  detail: string;
  priority: "عالية" | "متوسطة" | "منخفضة";
  owner: string;
  status: "جديد" | "قيد التنفيذ" | "منفذ" | "مرفوض";
};

export const requestRows: RequestRow[] = [
  { id: "r1", guest: "Dr. Amina Kone", category: "ترجمة", detail: "مترجم فوري فرنسي-عربي خلال الجلسة الافتتاحية", priority: "عالية", owner: "ريم الحربي", status: "منفذ" },
  { id: "r2", guest: "د. سلطان الغامدي", category: "نقل خاص", detail: "سيارة مخصصة للتنقل بين الفندق والموقع", priority: "متوسطة", owner: "خالد السبيعي", status: "قيد التنفيذ" },
  { id: "r3", guest: "Prof. Daniel Reyes", category: "تغذية", detail: "وجبات نباتية طوال فترة الإقامة", priority: "منخفضة", owner: "منى الصالح", status: "منفذ" },
  { id: "r4", guest: "أ. ليلى المنصور", category: "تجهيزات تقنية", detail: "شاشة عرض إضافية وميكروفون لاصق", priority: "عالية", owner: "بندر الرشيد", status: "جديد" },
  { id: "r5", guest: "د. هند الزهراني", category: "احتياج طبي", detail: "ثلاجة صغيرة لحفظ دواء في الغرفة", priority: "عالية", owner: "منى الصالح", status: "قيد التنفيذ" },
  { id: "r6", guest: "أ. مشاري العتيبي", category: "نقل خاص", detail: "توصيل إلى المطار الساعة 06:00", priority: "متوسطة", owner: "خالد السبيعي", status: "مرفوض" },
];

export type HotelRoomRow = {
  id: string;
  guest: string;
  hotel: "فندق الفيصلية" | "فندق الفورسيزونز" | "فندق نارسس";
  room: string;
  roomType: "جناح" | "غرفة تنفيذية" | "غرفة عادية";
  checkIn: string;
  checkOut: string;
  status: "محجوزة" | "تم تسجيل الدخول" | "تم تسجيل الخروج";
};

export const hotelRows: HotelRoomRow[] = [
  { id: "h1", guest: "م. يوسف بن عمر", hotel: "فندق الفيصلية", room: "1204", roomType: "جناح", checkIn: "10 نوفمبر", checkOut: "13 نوفمبر", status: "تم تسجيل الدخول" },
  { id: "h2", guest: "د. هند الزهراني", hotel: "فندق الفيصلية", room: "0918", roomType: "غرفة تنفيذية", checkIn: "10 نوفمبر", checkOut: "12 نوفمبر", status: "تم تسجيل الدخول" },
  { id: "h3", guest: "Prof. Daniel Reyes", hotel: "فندق الفورسيزونز", room: "1503", roomType: "جناح", checkIn: "10 نوفمبر", checkOut: "14 نوفمبر", status: "محجوزة" },
  { id: "h4", guest: "أ. ليلى المنصور", hotel: "فندق نارسس", room: "0421", roomType: "غرفة تنفيذية", checkIn: "10 نوفمبر", checkOut: "12 نوفمبر", status: "محجوزة" },
  { id: "h5", guest: "أ. مشاري العتيبي", hotel: "فندق نارسس", room: "0307", roomType: "غرفة عادية", checkIn: "09 نوفمبر", checkOut: "11 نوفمبر", status: "تم تسجيل الخروج" },
];

export type TripRow = {
  id: string;
  passenger: string;
  driver: string;
  vehicle: string;
  from: string;
  to: string;
  time: string;
  status: "مجدولة" | "جارية" | "مكتملة" | "ملغاة";
};

export const tripRows: TripRow[] = [
  { id: "t1", passenger: "د. سلطان الغامدي", driver: "فهد الشمري", vehicle: "GMC يوكن — ر ط ن 4412", from: "مطار الملك خالد", to: "فندق الفيصلية", time: "14:50", status: "مجدولة" },
  { id: "t2", passenger: "أ. ليلى المنصور", driver: "ماجد الدوسري", vehicle: "مرسيدس S500 — أ ب ج 2210", from: "مطار الملك خالد", to: "فندق نارسس", time: "15:25", status: "جارية" },
  { id: "t3", passenger: "Prof. Daniel Reyes", driver: "سعد المطيري", vehicle: "لكزس ES — ك ل م 7788", from: "فندق الفورسيزونز", to: "موقع الفعالية", time: "16:40", status: "مجدولة" },
  { id: "t4", passenger: "م. يوسف بن عمر", driver: "بندر الرشيد", vehicle: "هيونداي H1 — د هـ و 5533", from: "فندق الفيصلية", to: "موقع الفعالية", time: "08:30", status: "مكتملة" },
  { id: "t5", passenger: "أ. مشاري العتيبي", driver: "تركي العنزي", vehicle: "تويوتا كامري — ن س ع 1199", from: "فندق نارسس", to: "مطار الملك خالد", time: "06:00", status: "ملغاة" },
];

export type ActivityLogRow = {
  id: string;
  kind: ActivityKind;
  detail: string;
  actor: string;
  time: string;
  state: "مكتمل" | "قيد التنفيذ" | "تنبيه";
};

export const activityLog: ActivityLogRow[] = [
  { id: "l1", kind: "هبوط رحلة", detail: "هبطت الرحلة EK 819 قادمة من دبي", actor: "نظام المطار", time: "اليوم 15:12", state: "مكتمل" },
  { id: "l2", kind: "وصول متحدث", detail: "وصول Prof. Daniel Reyes إلى صالة كبار الشخصيات", actor: "ريم الحربي", time: "اليوم 15:04", state: "مكتمل" },
  { id: "l3", kind: "بدء رحلة سيارة", detail: "انطلاق السائق تركي العنزي إلى فندق الفيصلية", actor: "خالد السبيعي", time: "اليوم 14:55", state: "قيد التنفيذ" },
  { id: "l4", kind: "وصول الفندق", detail: "تسجيل دخول م. يوسف بن عمر — غرفة 1204", actor: "منى الصالح", time: "اليوم 14:38", state: "مكتمل" },
  { id: "l5", kind: "تنفيذ طلب خاص", detail: "تم توفير مترجم فوري للدكتورة Amina Kone", actor: "ريم الحربي", time: "اليوم 14:22", state: "مكتمل" },
  { id: "l6", kind: "وصول متحدث", detail: "تأخر وصول د. هند الزهراني عن الموعد المحدد", actor: "غرفة العمليات", time: "اليوم 13:50", state: "تنبيه" },
  { id: "l7", kind: "بدء رحلة سيارة", detail: "رحلة توصيل إلى موقع الفعالية — 3 ركاب", actor: "خالد السبيعي", time: "اليوم 13:20", state: "مكتمل" },
  { id: "l8", kind: "هبوط رحلة", detail: "تأخير الرحلة LH 630 لمدة 25 دقيقة", actor: "نظام المطار", time: "اليوم 12:44", state: "تنبيه" },
  { id: "l9", kind: "تنفيذ طلب خاص", detail: "طلب تجهيزات تقنية للأستاذة ليلى المنصور قيد التنفيذ", actor: "بندر الرشيد", time: "اليوم 12:05", state: "قيد التنفيذ" },
  { id: "l10", kind: "وصول الفندق", detail: "تسجيل خروج أ. مشاري العتيبي من فندق نارسس", actor: "منى الصالح", time: "اليوم 09:30", state: "مكتمل" },
];
