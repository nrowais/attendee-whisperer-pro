import type { Field } from "@/components/portal/CrudPage";

const eventRef: Field = {
  key: "event_id",
  label: "الفعالية",
  type: "ref",
  ref: { table: "events", labelKey: "name" },
};

const speakerRef: Field = {
  key: "speaker_id",
  label: "المتحدث",
  type: "ref",
  ref: { table: "speakers", labelKey: "full_name" },
};

const flightRef: Field = {
  key: "flight_id",
  label: "الرحلة",
  type: "ref",
  ref: { table: "flights", labelKey: "flight_number" },
};

export const speakerFields: Field[] = [
  { key: "full_name", label: "الاسم الكامل", required: true },
  { key: "title", label: "الصفة" },
  { key: "organization", label: "الجهة" },
  { key: "country", label: "الدولة" },
  { key: "email", label: "البريد الإلكتروني" },
  { key: "phone", label: "الجوال" },
  { key: "bio", label: "نبذة", type: "textarea", list: false },
];

export const sessionFields: Field[] = [
  eventRef,
  speakerRef,
  { key: "session_title", label: "عنوان الجلسة", required: true },
  { key: "hall", label: "القاعة" },
  { key: "starts_at", label: "البداية", type: "datetime" },
  { key: "ends_at", label: "النهاية", type: "datetime" },
  { key: "notes", label: "ملاحظات", type: "textarea", list: false },
];

export const requestFields: Field[] = [
  eventRef,
  speakerRef,
  {
    key: "category_id",
    label: "التصنيف",
    type: "ref",
    ref: { table: "request_categories", labelKey: "name" },
  },
  { key: "title", label: "الطلب", required: true },
  {
    key: "priority",
    label: "الأولوية",
    type: "select",
    badge: true,
    options: [
      { value: "low", label: "منخفضة" },
      { value: "normal", label: "عادية" },
      { value: "high", label: "عالية" },
      { value: "urgent", label: "عاجلة" },
    ],
  },
  {
    key: "status",
    label: "الحالة",
    type: "select",
    badge: true,
    options: [
      { value: "open", label: "جديد" },
      { value: "in_progress", label: "قيد التنفيذ" },
      { value: "done", label: "منجز" },
      { value: "cancelled", label: "ملغي" },
    ],
  },
  { key: "details", label: "التفاصيل", type: "textarea", list: false },
];

export const inviteeFields: Field[] = [
  { key: "full_name", label: "الاسم الكامل", required: true },
  { key: "organization", label: "الجهة" },
  {
    key: "invitee_type",
    label: "التصنيف",
    type: "select",
    badge: true,
    options: [
      { value: "vip", label: "كبار الشخصيات" },
      { value: "guest", label: "ضيف" },
      { value: "media", label: "إعلام" },
      { value: "staff", label: "فريق عمل" },
    ],
  },
  { key: "email", label: "البريد الإلكتروني" },
  { key: "phone", label: "الجوال" },
];

export const invitationFields: Field[] = [
  eventRef,
  {
    key: "invitee_id",
    label: "المدعو",
    type: "ref",
    ref: { table: "invitees", labelKey: "full_name" },
  },
  {
    key: "status",
    label: "الحالة",
    type: "select",
    badge: true,
    options: [
      { value: "pending", label: "بانتظار الرد" },
      { value: "sent", label: "أُرسلت" },
      { value: "accepted", label: "مقبولة" },
      { value: "declined", label: "معتذر" },
    ],
  },
  { key: "sent_at", label: "تاريخ الإرسال", type: "datetime" },
  { key: "responded_at", label: "تاريخ الرد", type: "datetime", list: false },
  { key: "notes", label: "ملاحظات", type: "textarea", list: false },
];

export const attendanceFields: Field[] = [
  eventRef,
  {
    key: "invitee_id",
    label: "الحاضر",
    type: "ref",
    ref: { table: "invitees", labelKey: "full_name" },
  },
  { key: "checked_in_at", label: "وقت التسجيل", type: "datetime" },
  {
    key: "method",
    label: "طريقة التسجيل",
    type: "select",
    badge: true,
    options: [
      { value: "qr", label: "رمز QR" },
      { value: "manual", label: "يدوي" },
      { value: "badge", label: "بطاقة" },
    ],
  },
];

export const flightFields: Field[] = [
  { key: "airline", label: "شركة الطيران" },
  { key: "flight_number", label: "رقم الرحلة", required: true },
  { key: "origin", label: "من" },
  { key: "destination", label: "إلى" },
  { key: "departure_time", label: "الإقلاع", type: "datetime" },
  { key: "arrival_time", label: "الوصول", type: "datetime" },
  { key: "booking_ref", label: "رقم الحجز", list: false },
];

export const arrivalFields: Field[] = [
  eventRef,
  speakerRef,
  flightRef,
  { key: "arrival_time", label: "وقت الوصول", type: "datetime" },
  { key: "arrival_point", label: "نقطة الوصول" },
  { key: "terminal", label: "الصالة" },
  {
    key: "status",
    label: "الحالة",
    type: "select",
    badge: true,
    options: [
      { value: "scheduled", label: "مجدول" },
      { value: "arrived", label: "تم الوصول" },
      { value: "delayed", label: "متأخر" },
      { value: "cancelled", label: "ملغي" },
    ],
  },
  { key: "notes", label: "ملاحظات", type: "textarea", list: false },
];

export const departureFields: Field[] = [
  eventRef,
  speakerRef,
  flightRef,
  { key: "departure_time", label: "وقت المغادرة", type: "datetime" },
  { key: "departure_point", label: "نقطة المغادرة" },
  { key: "terminal", label: "الصالة" },
  {
    key: "status",
    label: "الحالة",
    type: "select",
    badge: true,
    options: [
      { value: "scheduled", label: "مجدول" },
      { value: "departed", label: "غادر" },
      { value: "delayed", label: "متأخر" },
      { value: "cancelled", label: "ملغي" },
    ],
  },
  { key: "notes", label: "ملاحظات", type: "textarea", list: false },
];

export const operationalStatusOptions = [
  { value: "scheduled", label: "مجدول" },
  { value: "arrived", label: "وصل المطار" },
  { value: "in_transport", label: "في النقل" },
  { value: "at_hotel", label: "في الفندق" },
  { value: "at_event", label: "في الفعالية" },
  { value: "departed", label: "غادر" },
  { value: "cancelled", label: "ملغي" },
];

export const guestOperationFields: Field[] = [
  { ...speakerRef, required: true },
  {
    key: "operational_status",
    label: "الحالة التشغيلية",
    type: "select",
    badge: true,
    options: operationalStatusOptions,
  },
  { key: "arrival_actual_time", label: "الوصول الفعلي", type: "datetime" },
  { key: "airport_received_at", label: "الاستقبال بالمطار", type: "datetime" },
  { key: "transport_departed_at", label: "انطلاق النقل", type: "datetime", list: false },
  { key: "hotel_arrived_at", label: "الوصول للفندق", type: "datetime", list: false },
  { key: "hotel_checkin_at", label: "تسجيل دخول الفندق", type: "datetime", list: false },
  { key: "event_arrived_at", label: "الوصول للفعالية", type: "datetime", list: false },
  { key: "departure_actual_time", label: "المغادرة الفعلية", type: "datetime" },
  { key: "notes", label: "ملاحظات", type: "textarea", list: false },
];


export const tripFields: Field[] = [
  eventRef,
  speakerRef,
  {
    key: "driver_id",
    label: "السائق",
    type: "ref",
    ref: { table: "drivers", labelKey: "full_name" },
  },
  {
    key: "vehicle_id",
    label: "المركبة",
    type: "ref",
    ref: { table: "vehicles", labelKey: "plate_number" },
  },
  {
    key: "trip_type",
    label: "نوع الرحلة",
    type: "select",
    badge: true,
    options: [
      { value: "airport_pickup", label: "استقبال من المطار" },
      { value: "airport_dropoff", label: "توصيل للمطار" },
      { value: "hotel_venue", label: "الفندق ↔ المقر" },
      { value: "other", label: "أخرى" },
    ],
  },
  { key: "pickup_location", label: "من" },
  { key: "dropoff_location", label: "إلى" },
  { key: "scheduled_at", label: "الموعد", type: "datetime" },
  {
    key: "status",
    label: "الحالة",
    type: "select",
    badge: true,
    options: [
      { value: "scheduled", label: "مجدولة" },
      { value: "in_progress", label: "جارية" },
      { value: "completed", label: "مكتملة" },
      { value: "cancelled", label: "ملغاة" },
    ],
  },
  { key: "notes", label: "ملاحظات", type: "textarea", list: false },
];

export const ticketFields: Field[] = [
  ...tripFields.filter((f) => f.key !== "notes"),
  { key: "passengers", label: "عدد الركاب", type: "number", list: false },
  { key: "actual_pickup_at", label: "الانطلاق الفعلي", type: "datetime", list: false },
  { key: "actual_dropoff_at", label: "الوصول الفعلي", type: "datetime", list: false },
  { key: "ticket_notes", label: "ملاحظات التذكرة", type: "textarea", list: false },
];


export const driverFields: Field[] = [
  { key: "full_name", label: "اسم السائق", required: true },
  { key: "phone", label: "الجوال" },
  { key: "national_id", label: "رقم الهوية" },
  { key: "is_available", label: "متاح", type: "switch" },
];

export const vehicleFields: Field[] = [
  { key: "plate_number", label: "رقم اللوحة", required: true },
  { key: "make", label: "الماركة" },
  { key: "model", label: "الطراز" },
  { key: "capacity", label: "عدد الركاب", type: "number" },
  { key: "is_available", label: "متاحة", type: "switch" },
];

export const hotelFields: Field[] = [
  { key: "name", label: "اسم الفندق", required: true },
  { key: "city", label: "المدينة" },
  { key: "address", label: "العنوان" },
  { key: "phone", label: "الهاتف" },
  { key: "rating", label: "التصنيف (نجوم)", type: "number" },
];

export const roomFields: Field[] = [
  {
    key: "hotel_id",
    label: "الفندق",
    type: "ref",
    ref: { table: "hotels", labelKey: "name" },
    required: true,
  },
  { key: "room_number", label: "رقم الغرفة" },
  { key: "room_type", label: "نوع الغرفة" },
  { key: "capacity", label: "السعة", type: "number" },
  { key: "nightly_rate", label: "سعر الليلة", type: "number", list: false },
];

export const bookingFields: Field[] = [
  eventRef,
  speakerRef,
  {
    key: "hotel_id",
    label: "الفندق",
    type: "ref",
    ref: { table: "hotels", labelKey: "name" },
  },
  {
    key: "room_id",
    label: "الغرفة",
    type: "ref",
    ref: { table: "hotel_rooms", labelKey: "room_number" },
  },
  { key: "check_in", label: "تاريخ الدخول", type: "date" },
  { key: "check_out", label: "تاريخ الخروج", type: "date" },
  {
    key: "status",
    label: "الحالة",
    type: "select",
    badge: true,
    options: [
      { value: "reserved", label: "محجوزة" },
      { value: "checked_in", label: "تم تسجيل الدخول" },
      { value: "checked_out", label: "تم تسجيل الخروج" },
      { value: "cancelled", label: "ملغاة" },
    ],
  },
  { key: "notes", label: "ملاحظات", type: "textarea", list: false },
];

export const staffFields: Field[] = [
  { key: "full_name", label: "الاسم", required: true },
  { key: "job_title", label: "المسمى الوظيفي" },
  { key: "department", label: "الإدارة" },
  { key: "phone", label: "الجوال" },
  { key: "email", label: "البريد الإلكتروني" },
];

export const assignmentFields: Field[] = [
  eventRef,
  {
    key: "staff_id",
    label: "الموظف",
    type: "ref",
    ref: { table: "staff", labelKey: "full_name" },
    required: true,
  },
  { key: "role_in_event", label: "الدور" },
  { key: "shift_start", label: "بداية الوردية", type: "datetime" },
  { key: "shift_end", label: "نهاية الوردية", type: "datetime" },
  { key: "notes", label: "ملاحظات", type: "textarea", list: false },
];

export const categoryFields: Field[] = [
  { key: "name", label: "اسم التصنيف", required: true },
  { key: "description", label: "الوصف", type: "textarea" },
];

export const eventFields: Field[] = [
  { key: "name", label: "اسم الفعالية", required: true },
  { key: "venue", label: "المقر" },
  { key: "city", label: "المدينة" },
  { key: "start_date", label: "تاريخ البداية", type: "date" },
  { key: "end_date", label: "تاريخ النهاية", type: "date" },
  {
    key: "status",
    label: "الحالة",
    type: "select",
    badge: true,
    options: [
      { value: "planning", label: "تحت التخطيط" },
      { value: "active", label: "جارية" },
      { value: "completed", label: "منتهية" },
      { value: "cancelled", label: "ملغاة" },
    ],
  },
  { key: "description", label: "الوصف", type: "textarea", list: false },
];

export const driverCardFields: Field[] = [
  { key: "card_no", label: "رقم البطاقة" },
  { key: "guest_name", label: "اسم الضيف" },
  { key: "terminal", label: "صالة المطار" },
  { key: "receiver_name", label: "اسم المستقبل" },
  { key: "receiver_phone", label: "جوال المستقبل" },
  { key: "flight_at", label: "موعد الرحلة", type: "datetime" },
  { key: "flight_no", label: "رقم الرحلة" },
  { key: "driver_name", label: "السائق", list: false },
  { key: "vehicle", label: "المركبة", list: false },
  { key: "pickup_location", label: "نقطة الانطلاق", list: false },
  { key: "dropoff_location", label: "الوجهة", list: false },
  { key: "ticket_no", label: "رقم التذكرة", list: false },
];
