import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only: returns the sync token so the admin can build the Google Sheets formulas. */
export const getSheetsSyncToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    if (!isAdmin) throw new Error("غير مصرح: هذه الصفحة للمدير فقط");

    const token = process.env["SHEETS_SYNC_TOKEN"];
    if (!token) throw new Error("لم يتم ضبط مفتاح المزامنة بعد");
    return { token };
  });
