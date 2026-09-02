import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type FlightRow = Database["public"]["Tables"]["flights"]["Row"];

const AVIATIONSTACK_BASE = "http://api.aviationstack.com/v1/flights";

interface AviationFlight {
  flight_status?: string;
  departure?: {
    estimated?: string;
    actual?: string;
    terminal?: string;
    gate?: string;
    delay?: number;
  };
  arrival?: {
    estimated?: string;
    actual?: string;
    terminal?: string;
    gate?: string;
    delay?: number;
  };
}

async function getApiKey(supabase: any): Promise<string | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "aviationstack_api_key")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

function canEditCheck(supabase: any, userId: string) {
  return supabase.rpc("can_edit", { _user_id: userId });
}

function toIso(dt?: string | null) {
  if (!dt) return null;
  const d = new Date(dt);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function updateFlightFromLive(
  supabase: any,
  flightId: string,
  key: string,
) {
  const { data: flight, error } = await supabase
    .from("flights")
    .select("*")
    .eq("id", flightId)
    .single();
  if (error || !flight) throw new Error(error?.message ?? "الرحلة غير موجودة");

  const flightNumber = (flight.flight_number ?? "").trim();
  if (!flightNumber) throw new Error("الرحلة لا تحمل رقمًا");

  const flightDate =
    (flight.arrival_time ?? flight.departure_time ?? "").slice(0, 10) ||
    new Date().toISOString().slice(0, 10);

  const url = new URL(AVIATIONSTACK_BASE);
  url.searchParams.set("access_key", key);
  url.searchParams.set("flight_number", flightNumber);
  url.searchParams.set("flight_date", flightDate);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`فشل الاتصال بخدمة الطيران: ${res.status}`);

  const json = (await res.json()) as { data?: AviationFlight[]; error?: { info?: string } };
  if (json.error) throw new Error(json.error.info ?? "خطأ من خدمة الطيران");
  if (!json.data || json.data.length === 0) {
    throw new Error("لم يتم العثور على الرحلة في AviationStack بهذا التاريخ.");
  }

  const live = json.data[0];
  const delay = live.arrival?.delay ?? live.departure?.delay ?? 0;
  const liveStatus = live.flight_status ?? "unknown";

  const update: Partial<FlightRow> = {
    live_status: liveStatus,
    live_delay_minutes: delay,
    live_actual_arrival: toIso(live.arrival?.actual ?? live.arrival?.estimated),
    live_actual_departure: toIso(live.departure?.actual ?? live.departure?.estimated),
    live_gate: live.arrival?.gate ?? live.departure?.gate,
    live_terminal: live.arrival?.terminal ?? live.departure?.terminal,
    live_last_synced_at: new Date().toISOString(),
    live_data: live as any,
  };

  const { error: updErr } = await supabase
    .from("flights")
    .update(update)
    .eq("id", flightId);
  if (updErr) throw new Error(updErr.message);

  if (delay >= 15 || ["cancelled", "diverted"].includes(liveStatus)) {
    const msg =
      liveStatus === "cancelled"
        ? `تم إلغاء الرحلة ${flight.flight_number}`
        : liveStatus === "diverted"
          ? `تم تحويل مسار الرحلة ${flight.flight_number}`
          : `تأخرت الرحلة ${flight.flight_number} ${delay} دقيقة`;

    await supabase.from("flight_alerts").insert({
      flight_id: flightId,
      alert_type: liveStatus === "cancelled" ? "cancellation" : "delay",
      due_at: flight.arrival_time ?? flight.departure_time ?? new Date().toISOString(),
      message: msg,
      status: "pending",
    });
  }

  return { ok: true, flightId, live };
}

/**
 * جلب رحلات الفعالية مع بيانات المتحدثين/الضيوف المرتبطين بها.
 */
export const getAirportBoard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as { supabase: any; userId: string };

    const { data: event } = await supabase
      .from("events")
      .select("start_date, end_date")
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    const start = event?.start_date
      ? new Date(event.start_date).toISOString()
      : new Date().toISOString();
    const end = event?.end_date
      ? new Date(`${event.end_date}T23:59:59`).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const filter = `and(arrival_time.gte.${start},arrival_time.lte.${end}),and(departure_time.gte.${start},departure_time.lte.${end})`;

    const { data: flights, error } = await supabase
      .from("flights")
      .select("*")
      .or(filter)
      .order("arrival_time", { ascending: true });

    if (error) throw new Error(error.message);

    const flightIds = (flights ?? [])
      .map((f: FlightRow) => f.id)
      .filter(Boolean);

    let arrivals: any[] = [];
    let departures: any[] = [];

    if (flightIds.length > 0) {
      const [{ data: arr }, { data: dep }] = await Promise.all([
        supabase
          .from("speaker_arrivals")
          .select("flight_id, speakers(full_name)")
          .in("flight_id", flightIds),
        supabase
          .from("speaker_departures")
          .select("flight_id, speakers(full_name)")
          .in("flight_id", flightIds),
      ]);
      arrivals = arr ?? [];
      departures = dep ?? [];
    }

    const personsByFlight = new Map<string, string[]>();
    for (const row of [...arrivals, ...departures]) {
      const fid = row.flight_id as string;
      const name = (row.speakers as any)?.full_name ?? "";
      if (!fid || !name) continue;
      if (!personsByFlight.has(fid)) personsByFlight.set(fid, []);
      const list = personsByFlight.get(fid)!;
      if (!list.includes(name)) list.push(name);
    }

    return {
      flights: flights ?? [],
      personsByFlight: Object.fromEntries(personsByFlight),
      eventRange: { start: start.slice(0, 10), end: end.slice(0, 10) },
    };
  });

/**
 * تحديث حالة رحلة واحدة من بيانات AviationStack.
 */
export const syncFlightStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { flightId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: allowed } = await canEditCheck(supabase, userId);
    if (!allowed) throw new Error("غير مصرح: تتطلب صلاحية مدير أو منسّق");

    const key = await getApiKey(supabase);
    if (!key) throw new Error("لم يتم ضبط مفتاح AviationStack بعد. اذهب إلى الإعدادات → متابعة الرحلات.");

    return updateFlightFromLive(supabase, data.flightId, key);
  });

/**
 * تحديث جميع رحلات الفعالية.
 */
export const syncAllFlights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: allowed } = await canEditCheck(supabase, userId);
    if (!allowed) throw new Error("غير مصرح: تتطلب صلاحية مدير أو منسّق");

    const key = await getApiKey(supabase);
    if (!key) throw new Error("لم يتم ضبط مفتاح AviationStack بعد. اذهب إلى الإعدادات → متابعة الرحلات.");

    const { data: flights, error } = await supabase.from("flights").select("id");
    if (error) throw new Error(error.message);

    const results = [];
    for (const f of flights ?? []) {
      try {
        const result = await updateFlightFromLive(supabase, f.id, key);
        results.push({ flightId: f.id, ok: true, result });
      } catch (e: any) {
        results.push({ flightId: f.id, ok: false, error: e.message });
      }
    }

    return { synced: results.length, results };
  });
