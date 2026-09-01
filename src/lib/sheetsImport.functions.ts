import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { IMPORT_TABLES } from "@/lib/sheetsImport";

type ImportPayload = { table: string; rows: Record<string, unknown>[] };

const validate = (data: unknown): ImportPayload => {
  const payload = data as ImportPayload;
  if (!payload || typeof payload.table !== "string" || !Array.isArray(payload.rows)) {
    throw new Error("بيانات الاستيراد غير صالحة");
  }
  const def = IMPORT_TABLES.find((t) => t.table === payload.table);
  if (!def) throw new Error("جدول غير مسموح بالاستيراد إليه");
  if (payload.rows.length === 0) throw new Error("لا توجد صفوف للاستيراد");
  if (payload.rows.length > 2000) throw new Error("الحد الأقصى 2000 صف في المرة الواحدة");

  const allowed = new Set(def.columns.map((c) => c.key));
  const rows = payload.rows.map((row) => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (allowed.has(key) && value !== "" && value !== null && value !== undefined) {
        clean[key] = value;
      }
    }
    return clean;
  });
  return { table: payload.table, rows: rows.filter((r) => Object.keys(r).length > 0) };
};

/** Imports spreadsheet rows (Google Sheets / Excel / CSV) into a whitelisted table. */
export const importSheetRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("غير مصرح: الاستيراد متاح لحساب المدير فقط");

    let rowsToInsert = data.rows;

    // speaker_sessions requires event_id + speaker_id: resolve them automatically
    if (data.table === "speaker_sessions") {
      const { data: ev } = await supabase
        .from("events")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!ev?.id) throw new Error("لا توجد فعالية مسجلة — أنشئ فعالية أولًا قبل استيراد الجلسات");

      const { data: speakers } = await supabase.from("speakers").select("id, full_name");
      const byName = new Map<string, string>(
        (speakers ?? []).map((s: any) => [String(s.full_name ?? "").trim(), s.id]),
      );

      rowsToInsert = data.rows.map((row) => {
        const { speaker_name, ...rest } = row as Record<string, any>;
        const speakerId = byName.get(String(speaker_name ?? "").trim());
        if (!speakerId) {
          throw new Error(`لم يتم العثور على متحدث بالاسم: ${speaker_name ?? "(فارغ)"}`);
        }
        return { ...rest, event_id: ev.id, speaker_id: speakerId };
      });
    }

    const chunkSize = 200;
    let inserted = 0;
    for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
      const chunk = rowsToInsert.slice(i, i + chunkSize);
      const { data: rows, error } = await supabase.from(data.table).insert(chunk).select("id");
      if (error) throw new Error(`تعذّر استيراد الصفوف: ${error.message}`);
      inserted += rows?.length ?? chunk.length;
    }

    return { inserted, table: data.table };
  });
