import { createFileRoute } from "@tanstack/react-router";

/**
 * مزامنة تلقائية لحالات الرحلات — تُستدعى من المجدول كل ١٠ دقائق.
 * POST /api/public/flights-sync  (Header: x-sync-token)
 * لا تعتمد على فتح المستخدم لأي صفحة.
 */
export const Route = createFileRoute("/api/public/flights-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncSpeakerFlights } = await import("@/lib/flightSync.server");

    const url = new URL(request.url);
    const token = request.headers.get("x-sync-token") ?? url.searchParams.get("token") ?? "";

    const { data: setting } = await (supabaseAdmin as any)
      .from("app_settings")
      .select("value")
      .eq("key", "flight_sync_token")
      .maybeSingle();

    const expected = setting?.value ?? "";
    if (!expected || token !== expected) {
      return json({ error: "unauthorized" }, 401);
    }

    const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const result = await syncSpeakerFlights(supabaseAdmin as any, { date, source: "cron" });

    return json({ ok: true, date, synced: result.synced, changed: result.changed }, 200);
  } catch (err) {
    console.error("[flights-sync] failed:", err instanceof Error ? err.message : err);
    return json({ ok: false, error: "sync_failed" }, 500);
  }
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
