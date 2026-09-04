import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, History, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { NotificationsPanel } from "@/components/portal/NotificationsPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({
    meta: [
      { title: "التحديثات وسجل النشاط — حوار الأمن والتاريخ" },
      { name: "description", content: "رفع التحديثات التشغيلية ومتابعتها لحظة بلحظة: الرحلات، الوصول، النقل، الإقامة، والطلبات." },
      { property: "og:title", content: "التحديثات وسجل النشاط — حوار الأمن والتاريخ" },
      { property: "og:description", content: "رفع التحديثات التشغيلية ومتابعتها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

const db = supabase as any;

const entityOptions = [
  { value: "speakers", label: "المتحدثون" },
  { value: "invitees", label: "المدعوون" },
  { value: "attendance", label: "الحضور" },
  { value: "flights", label: "الرحلات" },
  { value: "transport_trips", label: "النقل" },
  { value: "hotel_bookings", label: "الإقامة" },
  { value: "speaker_requests", label: "الطلبات الخاصة" },
  { value: "general", label: "عام" },
];

const actionOptions = [
  { value: "update", label: "تحديث" },
  { value: "alert", label: "تنبيه" },
  { value: "issue", label: "مشكلة" },
  { value: "resolved", label: "تم الحل" },
];

const actionVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  update: "secondary",
  alert: "destructive",
  issue: "destructive",
  resolved: "default",
};

function label(list: { value: string; label: string }[], v?: string | null) {
  return list.find((o) => o.value === v)?.label ?? v ?? "—";
}

function ActivityPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canEdit } = useRoles();

  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("general");
  const [action, setAction] = useState("update");
  const [note, setNote] = useState("");
  const [tab, setTab] = useState<"logs" | "notifications">("logs");

  const logs = useQuery({
    queryKey: ["activity-logs"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const profiles = useQuery({
    queryKey: ["activity-profiles"],
    queryFn: async () => {
      const { data, error } = await db.from("profiles").select("id, full_name, email");
      if (error) throw error;
      return data ?? [];
    },
  });

  const actorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of profiles.data ?? []) map[p.id] = p.full_name || p.email || "—";
    return map;
  }, [profiles.data]);

  const publish = useMutation({
    mutationFn: async () => {
      if (!note.trim()) throw new Error("اكتب نص التحديث أولًا");
      const { error } = await db.from("activity_logs").insert({
        user_id: user?.id,
        entity_type: entity,
        action,
        details: { note: note.trim() },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      toast.success("تم رفع التحديث");
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر رفع التحديث"),
  });

  const rows = (logs.data ?? []).filter((r: any) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    const text = [r.details?.note, label(entityOptions, r.entity_type), label(actionOptions, r.action), actorMap[r.user_id]]
      .map((v) => String(v ?? "").toLowerCase())
      .join(" ");
    return text.includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <History className="size-5 text-primary" />
            التحديثات والإشعارات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            سجل النشاط وإشعاراتك الخاصة في شاشة واحدة.
          </p>
        </div>
        {tab === "logs" ? (
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث في التحديثات…"
          className="w-full sm:w-72"
          aria-label="بحث في سجل النشاط"
        />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-secondary/60 p-1">
        {([
          { key: "logs", label: "سجل النشاط", icon: History },
          { key: "notifications", label: "الإشعارات", icon: BellRing },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "notifications" ? <NotificationsPanel /> : null}

      {tab === "logs" && canEdit ? (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity">القسم</Label>
                <Select value={entity} onValueChange={setEntity}>
                  <SelectTrigger id="entity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action">نوع التحديث</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger id="action">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">نص التحديث</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: وصل الدكتور سلطان إلى صالة كبار الشخصيات وتم استلامه من فريق المطار."
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => publish.mutate()} disabled={publish.isPending}>
                <Send className="size-4" />
                رفع التحديث
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "logs" ? (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">القسم</TableHead>
                <TableHead className="text-start">التحديث</TableHead>
                <TableHead className="text-start">المسؤول</TableHead>
                <TableHead className="text-start">الوقت</TableHead>
                <TableHead className="text-start">النوع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    جارٍ التحميل…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    لا توجد تحديثات بعد.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {label(entityOptions, r.entity_type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.details?.note ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{actorMap[r.user_id] ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ar-SA-u-ca-gregory", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionVariant[r.action] ?? "secondary"}>
                        {label(actionOptions, r.action)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
