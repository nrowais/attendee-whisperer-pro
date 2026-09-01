export type ImportColumn = { key: string; label: string; type?: "number" | "date" | "datetime" | "boolean" };

export type ImportTable = { table: string; label: string; columns: ImportColumn[] };

export const IMPORT_TABLES: ImportTable[] = [
  {
    table: "speakers",
    label: "المتحدثون",
    columns: [
      { key: "full_name", label: "الاسم الكامل" },
      { key: "title", label: "الصفة" },
      { key: "organization", label: "الجهة" },
      { key: "country", label: "الدولة" },
      { key: "email", label: "البريد الإلكتروني" },
      { key: "phone", label: "الجوال" },
      { key: "bio", label: "نبذة" },
    ],
  },
  {
    table: "invitees",
    label: "الضيوف والمدعوون",
    columns: [
      { key: "full_name", label: "الاسم الكامل" },
      { key: "email", label: "البريد الإلكتروني" },
      { key: "phone", label: "الجوال" },
      { key: "organization", label: "الجهة" },
      { key: "invitee_type", label: "نوع المدعو" },
    ],
  },
  {
    table: "flights",
    label: "رحلات الطيران",
    columns: [
      { key: "airline", label: "شركة الطيران" },
      { key: "flight_number", label: "رقم الرحلة" },
      { key: "origin", label: "من" },
      { key: "destination", label: "إلى" },
      { key: "departure_time", label: "وقت الإقلاع", type: "datetime" },
      { key: "arrival_time", label: "وقت الوصول", type: "datetime" },
      { key: "booking_ref", label: "رقم الحجز" },
    ],
  },
  {
    table: "drivers",
    label: "السائقون",
    columns: [
      { key: "full_name", label: "اسم السائق" },
      { key: "phone", label: "الجوال" },
      { key: "national_id", label: "الهوية" },
    ],
  },
  {
    table: "vehicles",
    label: "المركبات",
    columns: [
      { key: "plate_number", label: "رقم اللوحة" },
      { key: "make", label: "الماركة" },
      { key: "model", label: "الموديل" },
      { key: "capacity", label: "السعة", type: "number" },
    ],
  },
  {
    table: "hotels",
    label: "الفنادق",
    columns: [
      { key: "name", label: "اسم الفندق" },
      { key: "city", label: "المدينة" },
      { key: "address", label: "العنوان" },
      { key: "phone", label: "الهاتف" },
      { key: "rating", label: "التصنيف", type: "number" },
    ],
  },
  {
    table: "hotel_rooms",
    label: "الغرف",
    columns: [
      { key: "room_number", label: "رقم الغرفة" },
      { key: "room_type", label: "نوع الغرفة" },
      { key: "capacity", label: "السعة", type: "number" },
      { key: "nightly_rate", label: "سعر الليلة", type: "number" },
    ],
  },
  {
    table: "staff",
    label: "فريق العمل",
    columns: [
      { key: "full_name", label: "الاسم" },
      { key: "job_title", label: "المسمى الوظيفي" },
      { key: "department", label: "الإدارة" },
      { key: "phone", label: "الجوال" },
      { key: "email", label: "البريد الإلكتروني" },
    ],
  },
  {
    table: "speaker_sessions",
    label: "الجلسات",
    columns: [
      { key: "speaker_name", label: "اسم المتحدث" },
      { key: "session_title", label: "عنوان الجلسة" },
      { key: "hall", label: "القاعة" },
      { key: "starts_at", label: "البداية", type: "datetime" },
      { key: "ends_at", label: "النهاية", type: "datetime" },
      { key: "notes", label: "ملاحظات" },
    ],
  },
];

const normalize = (value: string) =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[\s_\-.]/g, "");

/** Best-effort match between a spreadsheet header and a table column. */
export function guessColumn(header: string, columns: ImportColumn[]): string | null {
  const h = normalize(header);
  if (!h) return null;
  const hit = columns.find((c) => normalize(c.key) === h || normalize(c.label) === h);
  if (hit) return hit.key;
  const partial = columns.find((c) => h.includes(normalize(c.label)) || normalize(c.label).includes(h));
  return partial?.key ?? null;
}
