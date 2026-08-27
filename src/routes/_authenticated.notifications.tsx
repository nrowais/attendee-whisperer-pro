import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "الإشعارات — بوابة إدارة الفعاليات" },
      { name: "description", content: "إشعارات المستخدم الخاصة بمهام وتحديثات الفعاليات." },
      { property: "og:title", content: "الإشعارات — بوابة إدارة الفعاليات" },
      { property: "og:description", content: "إشعارات المستخدم داخل البوابة." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notifications = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">الإشعارات</h1>
        <p className="mt-1 text-sm text-muted-foreground">التنبيهات الموجّهة إلى حسابك فقط.</p>
      </div>

      <div className="surface-card divide-y divide-border">
        {notifications.isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (notifications.data ?? []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <BellRing className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">لا توجد إشعارات حاليًا</p>
          </div>
        ) : (
          (notifications.data ?? []).map((n: any) => (
            <div key={n.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-medium text-foreground">{n.title}</p>
                {n.body ? <p className="mt-1 text-sm text-muted-foreground">{n.body}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("ar-SA-u-ca-gregory")}
                </p>
              </div>
              {!n.is_read ? (
                <Button variant="outline" size="sm" onClick={() => markRead.mutate(n.id)}>
                  تعليم كمقروء
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
