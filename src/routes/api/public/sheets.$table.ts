import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Google Sheets live sync feed.
 * GET /api/public/sheets/{table}?token=SHEETS_SYNC_TOKEN  ->  CSV
 *
 * Consumed from Google Sheets with =IMPORTDATA("<url>"), which Google
 * re-fetches automatically (roughly hourly, or on manual refresh).
 * The token is the only authentication: it is verified before any data read.
 */
export const SYNC_TABLES = [
  "speakers",
  "invitees",
  "invitations",
  "attendance",
  "speaker_sessions",
  "speaker_requests",
  "flights",
  "speaker_arrivals",
  "speaker_departures",
  "guest_operations",
  "transport_trips",
  "driver_cards",
  "drivers",
  "vehicles",
  "hotels",
  "hotel_rooms",
  "hotel_bookings",
  "staff",
  "staff_assignments",
  "events",
] as const;

export const Route = createFileRoute("/api/public/sheets/$table")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const token = new URL(request.url).searchParams.get("token") ?? "";
        const expected = process.env["SHEETS_SYNC_TOKEN"];

        if (!expected || token !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const table = params["table"] as (typeof SYNC_TABLES)[number];
        if (!SYNC_TABLES.includes(table)) {
          return new Response("Unknown table", { status: 404 });
        }

        const url = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !serviceKey) {
          return new Response("Not configured", { status: 503 });
        }

        try {
          const client = createClient(url, serviceKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data, error } = await client
            .from(table)
            .select("*")
            .order("created_at", { ascending: true })
            .limit(5000);

          if (error) {
            console.error("[sheets-sync] query failed:", error.message);
            return new Response("Query failed", { status: 500 });
          }

          return new Response(toCsv(data ?? []), {
            status: 200,
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        } catch (err) {
          console.error("[sheets-sync] unexpected failure:", err instanceof Error ? err.message : err);
          return new Response("Unexpected error", { status: 500 });
        }
      },
    },
  },
});

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [headers.map(cell).join(",")];
  for (const row of rows) lines.push(headers.map((h) => cell(row[h])).join(","));
  // BOM keeps Arabic readable when the CSV is opened directly in Excel.
  return `\uFEFF${lines.join("\n")}`;
}
