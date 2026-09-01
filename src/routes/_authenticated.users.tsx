import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  listAccountStates,
  setUserDisabled,
  setUserPassword,
} from "@/lib/adminUsers.functions";
import { useRoles, roleLabels, type AppRole } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "المستخدمون والصلاحيات — حوار الأمن والتاريخ" },
      { name: "description", content: "إدارة مستخدمي البوابة وصلاحياتهم: مدير، منسّق، مطّلع." },
      { property: "og:title", content: "المستخدمون والصلاحيات" },
      { property: "og:description", content: "إدارة صلاحيات فريق البوابة." },
    ],
  }),
  component: UsersPage,
});

const allRoles: AppRole[] = ["admin", "coordinator", "viewer", "operator"];

function UsersPage() {
  const { isAdmin } = useRoles();
  const queryClient = useQueryClient();
  const [pendingRoles, setPendingRoles] = useState<Record<string, AppRole>>({});


  const usersQuery = useQuery({
    queryKey: ["portal-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, phone, created_at, approval_status"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap: Record<string, AppRole> = {};
      for (const r of roles ?? []) roleMap[r.user_id] = r.role as AppRole;
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap[p.id] ?? "viewer" }));
    },
  });

  const setApproval = useMutation({
    mutationFn: async ({
      userId,
      status,
      role,
    }: {
      userId: string;
      status: "approved" | "rejected";
      role?: AppRole;
    }) => {
      if (status === "approved" && role) {
        const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
        if (delError) throw delError;
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (roleError) throw roleError;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          approval_status: status,
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-users"] });
      toast.success("تم تحديث حالة الحساب");
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر تحديث حالة الحساب"),
  });

  const pending = (usersQuery.data ?? []).filter(
    (u: any) => (u.approval_status ?? "approved") === "pending",
  );



  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delError } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delError) throw delError;
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-users"] });
      toast.success("تم تحديث الصلاحية");
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر تحديث الصلاحية"),
  });

  const fetchStates = useServerFn(listAccountStates);
  const updatePassword = useServerFn(setUserPassword);
  const updateDisabled = useServerFn(setUserDisabled);

  const statesQuery = useQuery({
    queryKey: ["portal-user-states"],
    enabled: isAdmin,
    queryFn: async () => {
      const rows = await fetchStates();
      const map: Record<string, { disabled: boolean; lastSignInAt: string | null }> = {};
      for (const r of rows) map[r.id] = { disabled: r.disabled, lastSignInAt: r.lastSignInAt };
      return map;
    },
  });

  const [passwordTarget, setPasswordTarget] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const changePassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) =>
      updatePassword({ data: { userId, password } }),
    onSuccess: () => {
      setPasswordTarget(null);
      setNewPassword("");
      toast.success("تم تغيير كلمة المرور");
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر تغيير كلمة المرور"),
  });

  const toggleDisabled = useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) =>
      updateDisabled({ data: { userId, disabled } }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["portal-user-states"] });
      queryClient.invalidateQueries({ queryKey: ["portal-users"] });
      toast.success(vars.disabled ? "تم إيقاف الحساب" : "تم تفعيل الحساب");
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر تحديث حالة الحساب"),
  });



  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">المستخدمون والصلاحيات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          المدير يضيف ويعدّل كل شيء، المنسّق يدير العمليات، والمطّلع يشاهد فقط.
        </p>
      </div>

      {pending.length > 0 ? (
        <div className="surface-card space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">
            طلبات تسجيل بانتظار الموافقة ({pending.length})
          </h2>
          {pending.map((u: any) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{u.full_name ?? "—"}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {u.email ?? "—"}
                </p>
              </div>
              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={pendingRoles[u.id] ?? "viewer"}
                    onValueChange={(value) =>
                      setPendingRoles((prev) => ({ ...prev, [u.id]: value as AppRole }))
                    }
                  >
                    <SelectTrigger className="h-9 w-40">
                      <SelectValue placeholder="الصلاحية" />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() =>
                      setApproval.mutate({
                        userId: u.id,
                        status: "approved",
                        role: pendingRoles[u.id] ?? "viewer",
                      })
                    }
                  >
                    موافقة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setApproval.mutate({ userId: u.id, status: "rejected" })}
                  >
                    رفض
                  </Button>
                </div>

              ) : (
                <Badge variant="secondary">بانتظار موافقة المدير</Badge>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <div className="surface-card overflow-hidden">
        {usersQuery.isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead className="text-start">الاسم</TableHead>
                <TableHead className="text-start">البريد الإلكتروني</TableHead>
                <TableHead className="text-start">الصلاحية</TableHead>
                <TableHead className="text-start">حالة الحساب</TableHead>
                {isAdmin ? <TableHead className="text-start">إدارة الحساب</TableHead> : null}
              </TableRow>

            </TableHeader>
            <TableBody>
              {(usersQuery.data ?? []).map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="text-start">{u.full_name ?? "—"}</TableCell>
                  <TableCell className="text-start" dir="ltr">
                    {u.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-start">
                    {isAdmin ? (
                      <Select
                        value={u.role}
                        onValueChange={(role) =>
                          changeRole.mutate({ userId: u.id, role: role as AppRole })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allRoles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {roleLabels[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{roleLabels[u.role as AppRole]}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-start">
                    {(() => {
                      const s = u.approval_status ?? "approved";
                      const label =
                        s === "approved" ? "مفعّل" : s === "rejected" ? "مرفوض" : "بانتظار الموافقة";
                      return (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary"
                            }
                          >
                            {label}
                          </Badge>
                          {isAdmin && s !== "approved" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setApproval.mutate({ userId: u.id, status: "approved" })
                              }
                            >
                              تفعيل
                            </Button>
                          ) : null}
                        </div>
                      );
                    })()}
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-start">
                      {(() => {
                        const disabled = statesQuery.data?.[u.id]?.disabled ?? false;
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={disabled ? "destructive" : "secondary"}>
                              {disabled ? "موقوف" : "نشِط"}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPasswordTarget({ id: u.id, email: u.email ?? "" })
                              }
                            >
                              تغيير كلمة المرور
                            </Button>
                            <Button
                              size="sm"
                              variant={disabled ? "default" : "destructive"}
                              disabled={toggleDisabled.isPending}
                              onClick={() =>
                                toggleDisabled.mutate({ userId: u.id, disabled: !disabled })
                              }
                            >
                              {disabled ? "إعادة تفعيل" : "إيقاف الحساب"}
                            </Button>
                          </div>
                        );
                      })()}
                    </TableCell>
                  ) : null}
                </TableRow>

              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
