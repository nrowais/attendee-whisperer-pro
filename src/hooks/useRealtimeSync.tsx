import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * الجداول المشتركة بين أقسام البوابة — أي تغيير عليها يحدّث كل الشاشات.
 */
const SYNCED_TABLES = [
  "speakers",
  "invitees",
  "invitations",
  "attendance",
  "events",
  "speaker_sessions",
  "speaker_arrivals",
  "speaker_departures",
  "flights",
  "flight_alerts",
  "hotels",
  "hotel_rooms",
  "hotel_bookings",
  "drivers",
  "vehicles",
  "transport_trips",
  "driver_cards",
  "guest_operations",
  "speaker_requests",
  "request_categories",
  "staff",
  "staff_assignments",
  "activity_logs",
  "profiles",
  "user_roles",
] as const;

/**
 * مفاتيح الاستعلامات التي يجب تحديثها عند أي تغيير في قاعدة البيانات.
 * التحديث شامل لضمان انعكاس البيانات المشتركة في كل الأقسام.
 */
const GLOBAL_KEYS = [
  "crud",
  "crud-refs",
  "live-stats",
  "dashboard",
  "guest-journey",
  "speakers-status-board",
  "operations-manage",
  "hotel-checkin-board",
  "transport-tickets",
  "fleet-trips",
  "daily-entry",
  "daily-lookups",
  "calendar",
  "attendance-board",
  "todays-sessions",
  "upcoming-countdown",
  "flight-alerts-log",
  "airport-board",
  "activity-logs",
  "report",
];

export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const flush = () => {
      timerRef.current = null;
      for (const key of GLOBAL_KEYS) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    };

    const schedule = () => {
      if (timerRef.current) return;
      timerRef.current = setTimeout(flush, 400);
    };

    const channel = supabase.channel("portal-global-sync");
    for (const table of SYNCED_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => schedule(),
      );
    }
    channel.subscribe();

    // مزامنة احتياطية عند العودة للتبويب
    const onFocus = () => schedule();
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
