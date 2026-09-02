import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export type AppRole =
  | "admin"
  | "coordinator"
  | "viewer"
  | "operator"
  | "field_staff"
  | "registration";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export function useApproval() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["my-approval", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.approval_status ?? "pending") as ApprovalStatus;
    },
  });
  return { status: query.data, loading: query.isLoading };
}

export const roleLabels: Record<AppRole, string> = {
  admin: "مدير النظام",
  coordinator: "منسّق",
  viewer: "مطّلع",
  operator: "مسؤول تشغيل",
  field_staff: "موظف مطار/فندق",
  registration: "موظف تسجيل الحضور",
};

export function useRoles() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["my-roles", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = query.data ?? [];
  const isOperator = roles.includes("operator");
  const isFieldStaff = roles.includes("field_staff");
  const isRegistration = roles.includes("registration");
  const canEdit = roles.includes("admin") || roles.includes("coordinator");
  return {
    roles,
    isAdmin: roles.includes("admin"),
    canEdit,
    isOperator,
    isFieldStaff,
    isRegistration,
    // صلاحية تعديل الحالة التشغيلية فقط
    canEditOps: canEdit || isOperator || isFieldStaff,
    // صلاحية تسجيل الحضور وإضافة المدعوين
    canRegister: canEdit || isRegistration,
    // الحذف مقصور على المدير والمنسّق
    canDelete: canEdit,
    loading: query.isLoading,
  };
}
