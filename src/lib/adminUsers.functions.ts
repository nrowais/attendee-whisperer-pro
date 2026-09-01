import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("غير مصرح: هذه العملية للمدير فقط");
}

/** Returns auth-level account state (disabled / last sign-in) for all users. */
export const listAccountStates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      disabled: Boolean((u as any).banned_until && new Date((u as any).banned_until) > new Date()),
      lastSignInAt: u.last_sign_in_at ?? null,
    }));
  });

export const setUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; password: string }) => {
    if (!input?.userId) throw new Error("المستخدم غير محدد");
    if (!input?.password || input.password.length < 6)
      throw new Error("كلمة المرور يجب ألا تقل عن 6 خانات");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; disabled: boolean }) => {
    if (!input?.userId) throw new Error("المستخدم غير محدد");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (data.disabled && data.userId === (context as any).userId)
      throw new Error("لا يمكنك إيقاف حسابك الخاص");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.disabled ? "876000h" : "none",
    } as any);
    if (error) throw new Error(error.message);
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ approval_status: data.disabled ? "rejected" : "approved" } as any)
      .eq("id", data.userId);
    if (profileError) throw new Error(profileError.message);
    return { ok: true };
  });
