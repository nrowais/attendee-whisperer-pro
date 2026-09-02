/** ثوابت حالات الرحلات ومراحل الاستقبال — آمنة للاستخدام في الواجهة. */

export const FLIGHT_STATUSES = [
  "scheduled",
  "boarding",
  "departed",
  "enroute",
  "landed",
  "arrived",
  "delayed",
  "cancelled",
  "diverted",
  "unknown",
] as const;

export type FlightStatus = (typeof FLIGHT_STATUSES)[number];

export const FLIGHT_STATUS_LABELS: Record<FlightStatus, string> = {
  scheduled: "مجدولة",
  boarding: "صعود الطائرة",
  departed: "غادرت",
  enroute: "في الجو",
  landed: "هبطت",
  arrived: "وصلت",
  delayed: "متأخرة",
  cancelled: "ملغاة",
  diverted: "تم تحويل مسارها",
  unknown: "غير معروفة",
};

export const RECEPTION_STAGES = [
  "arrived_airport",
  "received",
  "baggage",
  "left_airport",
  "on_way_hotel",
  "at_hotel",
  "checked_in",
] as const;

export type ReceptionStage = (typeof RECEPTION_STAGES)[number];

export const RECEPTION_STAGE_LABELS: Record<ReceptionStage, string> = {
  arrived_airport: "وصل المطار",
  received: "تم الاستقبال",
  baggage: "استلم الأمتعة",
  left_airport: "غادر المطار",
  on_way_hotel: "في الطريق للفندق",
  at_hotel: "وصل الفندق",
  checked_in: "تم التسكين",
};

