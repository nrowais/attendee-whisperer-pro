import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { syncSpeakerFlights } from "@/lib/flightSync.server";

/** لوحة مركز الرحلات والاستقبال — المتحدثون وبيانات رحلاتهم وسجل التغيّرات. */
export const getReceptionBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;

    const [{ data: speakers, error }, { data: history }, { data: trips }] = await Promise.all([
      supabase.from("speakers").select("*").order("scheduled_arrival", { ascending: true }),
      supabase
        .from("flight_status_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("transport_trips")
        .select("speaker_id, trip_type, drivers(full_name, phone), vehicles(plate_number, make, model)")
        .order("scheduled_at", { ascending: false }),
    ]);

    if (error) throw new Error(error.message);

    const logistics: Record<string, { driver?: string | undefined; phone?: string | undefined; vehicle?: string | undefined }> = {};
    for (const t of trips ?? []) {
      if (!t.speaker_id || logistics[t.speaker_id]) continue;
      logistics[t.speaker_id] = {
        driver: t.drivers?.full_name ?? undefined,
        phone: t.drivers?.phone ?? undefined,
        vehicle: t.vehicles
          ? [t.vehicles.make, t.vehicles.model, t.vehicles.plate_number].filter(Boolean).join(" ")
          : undefined,
      };
    }

    return { speakers: speakers ?? [], history: history ?? [], logistics };
  });

const flightFields = z.object({
  speakerId: z.string().uuid(),
  patch: z.object({
    flight_number: z.string().nullable().optional(),
    flight_date: z.string().nullable().optional(),
    departure_airport: z.string().nullable().optional(),
    arrival_airport: z.string().nullable().optional(),
    airline: z.string().nullable().optional(),
    scheduled_arrival: z.string().nullable().optional(),
    estimated_arrival: z.string().nullable().optional(),
    scheduled_departure: z.string().nullable().optional(),
    terminal: z.string().nullable().optional(),
    gate: z.string().nullable().optional(),
    baggage_belt: z.string().nullable().optional(),
    flight_status: z.string().nullable().optional(),
    reception_stage: z.string().nullable().optional(),
    receptionist_name: z.string().nullable().optional(),
    receptionist_phone: z.string().nullable().optional(),
    driver_name: z.string().nullable().optional(),
    vehicle_label: z.string().nullable().optional(),
  }),
});

/** تحديث بيانات رحلة/استقبال متحدث يدويًا. */
export const updateSpeakerFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => flightFields.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: allowed } = await supabase.rpc("can_update_ops", { _user_id: context.userId });
    if (!allowed) throw new Error("لا تملك صلاحية التعديل");

    const patch: Record<string, unknown> = { ...data.patch };
    for (const k of Object.keys(patch)) if (patch[k] === "") patch[k] = null;

    if (patch["scheduled_arrival"] && patch["estimated_arrival"]) {
      patch["delay_minutes"] = Math.max(
        0,
        Math.round(
          (new Date(patch["estimated_arrival"] as string).getTime() -
            new Date(patch["scheduled_arrival"] as string).getTime()) /
            60000,
        ),
      );
    }

    const { data: before } = await supabase
      .from("speakers")
      .select("flight_status, estimated_arrival, flight_number")
      .eq("id", data.speakerId)
      .maybeSingle();

    const { error } = await supabase.from("speakers").update(patch).eq("id", data.speakerId);
    if (error) throw new Error(error.message);

    if (patch["flight_status"] && before && before.flight_status !== patch["flight_status"]) {
      await supabase.from("flight_status_history").insert({
        speaker_id: data.speakerId,
        flight_number: (patch["flight_number"] as string) ?? before.flight_number ?? null,
        old_status: before.flight_status,
        new_status: patch["flight_status"],
        old_estimated_arrival: before.estimated_arrival,
        new_estimated_arrival: (patch["estimated_arrival"] as string) ?? before.estimated_arrival,
        delay_minutes: (patch["delay_minutes"] as number) ?? null,
        source: "manual",
      });
    }

    return { ok: true };
  });

/** مزامنة رحلة متحدث واحد الآن. */
export const syncOneSpeakerFlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ speakerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: allowed } = await supabase.rpc("can_update_ops", { _user_id: context.userId });
    if (!allowed) throw new Error("لا تملك صلاحية التحديث");
    return syncSpeakerFlights(supabase, { speakerIds: [data.speakerId], source: "manual-sync" });
  });

/** مزامنة كل رحلات اليوم (أو تاريخ محدد). */
export const syncAllSpeakerFlights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ date: z.string().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: allowed } = await supabase.rpc("can_update_ops", { _user_id: context.userId });
    if (!allowed) throw new Error("لا تملك صلاحية التحديث");
    return syncSpeakerFlights(supabase, data.date ? { date: data.date, source: "manual-sync-all" } : { source: "manual-sync-all" });
  });
