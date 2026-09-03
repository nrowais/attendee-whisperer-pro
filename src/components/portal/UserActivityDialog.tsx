import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getUserActivity } from "@/lib/adminUsers.functions";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const actionLabels: Record<string, string> = {
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
  participant_matched: "ربط مشارك بمتحدث",
  participant_match_rejected: "رفض اقتراح مطابقة",
  participant_relinked: "تغيير ربط مشارك",
  participant_unlinked: "فك ربط مشارك",
  participant_added: "إضافة مشارك لجلسة",
  participant_deleted: "حذف مشارك من جلسة",
};

const entityLabels: Record<string, string> = {
  sessions: "الجلسات",
  guest_operations: "الحالة التشغيلية",
  transport_trips: "رحلات النقل",
  hotel_bookings: "حجوزات الفنادق",
  attendance: "الحضور",
  speakers: "المتحدثون",
  invitees: "المدعوون",
  driver_cards: "بطاقات السائقين",
};

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-SA-u-ca-gregory", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function UserActivityDialog({
  user,
  onOpenChange,
}: {
  user: { id: string; name: string; email: string | null } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const fetchActivity = useServerFn(getUserActivity);
  const activityQuery = useQuery({
    queryKey: ["user-activity", user?.id],
    enabled: !!user,
    queryFn: async () => fetchActivity({ data: { userId: user!.id, limit: 150 } }),
  });

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            سجل نشاط: {user?.name}
            {user?.email ? (
              <span className="ms-2 text-xs font-normal text-muted-foreground" dir="ltr">
                {user.email}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {activityQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : activityQuery.error ? (
          <p className="text-sm text-destructive">
            {(activityQuery.error as any)?.message ?? "تعذر تحميل السجل"}
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="آخر اتصال" value={formatDateTime(activityQuery.data?.account.lastSignInAt)} />
              <Stat label="تاريخ إنشاء الحساب" value={formatDateTime(activityQuery.data?.account.createdAt)} />
              <Stat
                label="تأكيد البريد"
                value={formatDateTime(activityQuery.data?.account.emailConfirmedAt)}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                آخر العمليات ({activityQuery.data?.logs.length ?? 0})
              </h3>
              {!activityQuery.data?.logs.length ? (
                <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                  لا يوجد نشاط مسجّل لهذا المستخدم.
                </p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {activityQuery.data.logs.map((log: any) => (
                    <li key={log.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {actionLabels[log.action] ?? log.action}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {(log.details as any)?.message ??
                            (log.details as any)?.participant_name ??
                            (log.details as any)?.speaker_name ??
                            "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {entityLabels[log.entity_type] ?? log.entity_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
