import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Health check for Railway / uptime monitors.
 * GET /api/public/health -> { status, database, timestamp }
 * Performs a real round-trip to the database. Never leaks env values or stack traces.
 */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
        const timestamp = new Date().toISOString();

        if (!url || !key) {
          console.error("[health] missing server database configuration");
          return json({ status: "error", database: "not_configured", timestamp }, 503);
        }

        try {
          const client = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { error } = await client
            .from("events")
            .select("id", { count: "exact", head: true });

          if (error) {
            console.error("[health] database query failed:", error.message);
            return json({ status: "error", database: "disconnected", timestamp }, 503);
          }

          return json({ status: "ok", database: "connected", timestamp }, 200);
        } catch (err) {
          console.error("[health] unexpected failure:", err instanceof Error ? err.message : err);
          return json({ status: "error", database: "disconnected", timestamp }, 503);
        }
      },
    },
  },
});

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
