/**
 * مزامنة حالات الرحلات من AeroDataBox (RapidAPI).
 * يعمل من الخادم فقط — مفتاح الـ API لا يصل إلى المتصفح إطلاقًا.
 */
import type { FlightStatus } from "@/lib/flightStatus";

function normalizeStatus(raw?: string | null): FlightStatus {
  const s = (raw ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (!s) return "unknown";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("divert")) return "diverted";
  if (s.includes("delay")) return "delayed";
  if (s.includes("arrived")) return "arrived";
  if (s.includes("landed")) return "landed";
  if (s.includes("approach") || s.includes("enroute") || s.includes("active") || s.includes("inflight"))
    return "enroute";
  if (s.includes("departed") || s.includes("gateclosed") || s.includes("takenoff")) return "departed";
  if (s.includes("boarding") || s.includes("checkin")) return "boarding";
  if (s.includes("expected") || s.includes("scheduled")) return "scheduled";
  return "unknown";
}

function pickTime(node: any): string | null {
  const v = node?.utc ?? node?.local ?? null;
  if (!v) return null;
  const d = new Date(String(v).replace(" ", "T").replace(/([+-]\d{2}:\d{2})?$/, (m) => m || "Z"));
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export interface SyncResult {
  speakerId: string;
  name: string;
  flightNumber: string | null;
  ok: boolean;
  status?: FlightStatus;
  delayMinutes?: number;
  error?: string;
}

async function fetchFlight(apiKey: string, flightNumber: string, date: string) {
  const url = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(
    flightNumber.replace(/\s+/g, ""),
  )}/${date}?withAircraftImage=false&withLocation=false`;

  const res = await fetch(url, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`خدمة الرحلات ردّت بالرمز ${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : json?.flights ?? [];
  return arr[0] ?? null;
}

/**
 * يزامن رحلات المتحدثين الذين لديهم رقم رحلة وتاريخ رحلة.
 * يكتب سجلًا في flight_status_history عند كل تغيّر — بدون حذف أي بيانات سابقة.
 */
export async function syncSpeakerFlights(
  db: any,
  opts: { speakerIds?: string[]; date?: string; source?: string } = {},
): Promise<{ synced: number; changed: number; results: SyncResult[] }> {
  const apiKey = process.env["AERODATABOX_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "مفتاح خدمة متابعة الرحلات (AERODATABOX_API_KEY) غير مُعرّف في إعدادات الخادم.",
    );
  }

  let query = db
    .from("speakers")
    .select("*")
    .not("flight_number", "is", null)
    .not("flight_date", "is", null);

  if (opts.speakerIds?.length) query = query.in("id", opts.speakerIds);
  else if (opts.date) query = query.eq("flight_date", opts.date);

  const { data: speakers, error } = await query;
  if (error) throw new Error(error.message);

  const results: SyncResult[] = [];
  let changed = 0;

  for (const sp of speakers ?? []) {
    const flightNumber = String(sp.flight_number ?? "").trim();
    const flightDate = String(sp.flight_date ?? "").slice(0, 10);
    if (!flightNumber || !flightDate) continue;

    try {
      const f = await fetchFlight(apiKey, flightNumber, flightDate);
      if (!f) {
        results.push({
          speakerId: sp.id,
          name: sp.full_name,
          flightNumber,
          ok: false,
          error: "لم يتم العثور على الرحلة بهذا التاريخ",
        });
        continue;
      }

      const status = normalizeStatus(f.status);
      const scheduledDeparture = pickTime(f.departure?.scheduledTime);
      const estimatedDeparture = pickTime(f.departure?.revisedTime) ?? pickTime(f.departure?.predictedTime);
      const actualDeparture = pickTime(f.departure?.runwayTime) ?? pickTime(f.departure?.actualTime);
      const scheduledArrival = pickTime(f.arrival?.scheduledTime);
      const estimatedArrival = pickTime(f.arrival?.revisedTime) ?? pickTime(f.arrival?.predictedTime);
      const actualArrival = pickTime(f.arrival?.runwayTime) ?? pickTime(f.arrival?.actualTime);

      const baseSched = scheduledArrival ?? sp.scheduled_arrival;
      const baseEst = estimatedArrival ?? actualArrival ?? sp.estimated_arrival;
      let delayMinutes = 0;
      if (baseSched && baseEst) {
        delayMinutes = Math.max(
          0,
          Math.round((new Date(baseEst).getTime() - new Date(baseSched).getTime()) / 60000),
        );
      }

      const effectiveStatus: FlightStatus =
        status === "cancelled" || status === "diverted" || status === "arrived" || status === "landed"
          ? status
          : delayMinutes >= 15
            ? "delayed"
            : status;

      const patch: Record<string, unknown> = {
        flight_status: effectiveStatus,
        delay_minutes: delayMinutes,
        airline: f.airline?.name ?? sp.airline,
        departure_airport:
          f.departure?.airport?.municipalityName ?? f.departure?.airport?.name ?? sp.departure_airport,
        arrival_airport:
          f.arrival?.airport?.municipalityName ?? f.arrival?.airport?.name ?? sp.arrival_airport,
        scheduled_departure: scheduledDeparture ?? sp.scheduled_departure,
        estimated_departure: estimatedDeparture ?? sp.estimated_departure,
        actual_departure: actualDeparture ?? sp.actual_departure,
        scheduled_arrival: scheduledArrival ?? sp.scheduled_arrival,
        estimated_arrival: estimatedArrival ?? sp.estimated_arrival,
        actual_arrival: actualArrival ?? sp.actual_arrival,
        terminal: f.arrival?.terminal ?? sp.terminal,
        gate: f.arrival?.gate ?? sp.gate,
        baggage_belt: f.arrival?.baggageBelt ?? sp.baggage_belt,
        last_flight_update: new Date().toISOString(),
      };

      // عند الهبوط أو الوصول: ينتقل المتحدث تلقائيًا إلى "وصل المطار"
      if ((effectiveStatus === "landed" || effectiveStatus === "arrived") && !sp.reception_stage) {
        patch["reception_stage"] = "arrived_airport";
      }

      const statusChanged = sp.flight_status !== effectiveStatus;
      const etaChanged = (sp.estimated_arrival ?? null) !== (patch["estimated_arrival"] ?? null);

      const { error: upErr } = await db.from("speakers").update(patch).eq("id", sp.id);
      if (upErr) throw new Error(upErr.message);

      if (statusChanged || etaChanged) {
        changed += 1;
        await db.from("flight_status_history").insert({
          speaker_id: sp.id,
          flight_number: flightNumber,
          old_status: sp.flight_status ?? null,
          new_status: effectiveStatus,
          old_estimated_arrival: sp.estimated_arrival ?? null,
          new_estimated_arrival: (patch["estimated_arrival"] as string | null) ?? null,
          delay_minutes: delayMinutes,
          source: opts.source ?? "aerodatabox",
        });

        if (effectiveStatus === "delayed" || effectiveStatus === "cancelled" || effectiveStatus === "diverted") {
          const msg =
            effectiveStatus === "cancelled"
              ? `⚠️ إلغاء رحلة ${flightNumber} الخاصة بـ ${sp.full_name}`
              : effectiveStatus === "diverted"
                ? `⚠️ تحويل مسار رحلة ${flightNumber} الخاصة بـ ${sp.full_name}`
                : `تأخّر رحلة ${flightNumber} الخاصة بـ ${sp.full_name} بمقدار ${delayMinutes} دقيقة`;
          const { data: roles } = await db.from("user_roles").select("user_id");
          if (roles?.length) {
            await db.from("notifications").insert(
              roles.map((r: any) => ({
                user_id: r.user_id,
                title: "تحديث حالة رحلة",
                body: msg,
                channel: "portal",
                is_read: false,
              })),
            );
          }
        }
      }

      results.push({
        speakerId: sp.id,
        name: sp.full_name,
        flightNumber,
        ok: true,
        status: effectiveStatus,
        delayMinutes,
      });
    } catch (e: any) {
      results.push({
        speakerId: sp.id,
        name: sp.full_name,
        flightNumber,
        ok: false,
        error: e?.message ?? "خطأ غير معروف",
      });
    }
  }

  return { synced: results.length, changed, results };
}
