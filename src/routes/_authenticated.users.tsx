import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles, roleLabels, type AppRole } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
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
      { title: "المستخدمون والصلاحيات — بوابة إدارة الفعاليات" },
      { name: "description", content: "إدارة مستخدمي البوابة وصلاحياتهم: مدير، منسّق، مطّلع." },
      { property: "og:title", content: "المستخدمون والصلاحيات" },
      { property: "og:description", content: "إدارة صلاحيات فريق البوابة." },
    ],
  }),
  component: UsersPage,
});

const allRoles: AppRole[] = ["admin", "coordinator", "viewer"];

function UsersPage() {
  const { isAdmin } = useRoles();
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ["portal-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap: Record<string, AppRole> = {};
      for (const r of roles ?? []) roleMap[r.user_id] = r.role as AppRole;
      return (profiles ?? []).map((p) => ({ ...p, role: roleMap[p.id] ?? "viewer" }));
    },
  });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">المستخدمون والصلاحيات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          المدير يضيف ويعدّل كل شيء، المنسّق يدير العمليات، والمطّلع يشاهد فقط.
        </p>
      </div>

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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
