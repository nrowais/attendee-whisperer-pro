import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRoles } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  completionGaps,
  fmtDuration,
  fmtTime,
  moderatorRoles,
  opStatusLabels,
  opsBreakdown,
  opsGroups,
  participantRoleLabels,
  readinessClasses,
  sessionReadiness,
  sessionStatusLabels,
  sessionTypeLabels,
  timePhase,
  nonSpeakerTypes,
  type ParticipantRole,
  type SessionStatus,
  type SessionType,
} from "@/lib/sessions";

import { cn } from "@/lib/utils";
import type { SessionRow, SpeakerOps, TrackRow } from "./data";

function Row({ label, value }: { label: string; value?: string | null | undefined }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

export function SessionDetail({
  session,
  tracks,
  opsMap,
  now,
  onClose,
  onEdit,
}: {
  session: SessionRow | null;
  tracks: TrackRow[];
  opsMap?: Map<string, SpeakerOps> | undefined;
  now: number;
  onClose: () => void;
  onEdit: (session: SessionRow) => void;
}) {
  const { canEdit, isAdmin, canEditOps } = useRoles();
  const queryClient = useQueryClient();

  const arrival = useMutation({
    mutationFn: async ({
      speakerId,
      arrived,
    }: {
      speakerId: string;
      arrived: boolean;
      eventId: string | null;
    }) => {
      const db = supabase as any;
      const nowIso = new Date().toISOString();
      const { data: existing } = await db
        .from("guest_operations")
        .select("id")
        .eq("speaker_id", speakerId)
        .maybeSingle();
      const payload: Record<string, unknown> = arrived
        ? { operational_status: "arrived_airport", arrival_actual_time: nowIso }
        : { operational_status: "not_arrived", arrival_actual_time: null };
      if (existing?.id) {
        const { error } = await db.from("guest_operations").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        if (!arrived) return;
        const { error } = await db
          .from("guest_operations")
          .insert({ speaker_id: speakerId, ...payload });
        if (error) throw error;
      }
      await supabase.auth.getUser().then(({ data }) =>
        db.from("activity_logs").insert({
          user_id: data.user?.id ?? null,
          entity_type: "speakers",
          entity_id: speakerId,
          action: arrived ? "session_arrival_checkin" : "session_arrival_undo",
          details: { source: "session_detail", at: nowIso },
        }),
      );
    },
    onSuccess: (_v, vars) => {
      queryClient.invalidateQueries({ queryKey: ["sessions-speaker-ops"] });
      queryClient.invalidateQueries({ queryKey: ["ops-board"] });
      toast.success(vars.arrived ? "تم تسجيل الوصول" : "تم التراجع عن الوصول");
    },
    onError: () => toast.error("تعذر تحديث حالة الوصول"),
  });

  if (!session) return null;
  const track = tracks.find((t) => t.id === session.track_id);
  const phase = timePhase(session, now);
  const participants = session.session_participants ?? [];
  const isBreak = nonSpeakerTypes.includes(session.session_type as SessionType);
  const statuses = isBreak
    ? []
    : participants.map((p) => (p.speaker_id ? (opsMap?.get(p.speaker_id)?.status ?? null) : null));
  const readiness = sessionReadiness(phase, statuses);
  const breakdown = opsBreakdown(statuses);
  const gaps = completionGaps(session);


  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-start leading-7">
            {session.title_ar || session.title_en || "بدون عنوان"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Row label="التاريخ" value={session.session_date} />
            <Row label="المسار" value={track?.name_ar} />
            <Row label="وقت البداية" value={fmtTime(session.start_time)} />
            <Row label="وقت النهاية" value={fmtTime(session.end_time)} />
            <Row label="المدة" value={fmtDuration(session.duration_minutes)} />
            <Row
              label="نوع الجلسة"
              value={sessionTypeLabels[session.session_type as SessionType] ?? session.session_type}
            />
            <Row label="الموضوع" value={session.topic} />
            <Row label="الجهة المشاركة" value={session.partner_text} />
            <Row
              label="الحالة"
              value={sessionStatusLabels[session.status as SessionStatus] ?? session.status}
            />
          </div>

          {session.notes ? <Row label="الملاحظات" value={session.notes} /> : null}
          {session.description ? <Row label="الوصف" value={session.description} /> : null}

          {gaps.length ? (
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900">
              <span className="text-xs font-bold">بيانات تحتاج استكمال:</span>
              {gaps.map((g) => (
                <span key={g} className="rounded-full border border-amber-300 px-2 py-0.5 text-[11px]">
                  {g}
                </span>
              ))}
            </div>
          ) : null}

          {!isBreak ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <div className="rounded-xl border border-border bg-secondary/40 p-2 text-center">
                <p className="text-lg font-bold tabular-nums text-foreground">{breakdown.total}</p>
                <p className="text-[11px] text-muted-foreground">إجمالي المتحدثين</p>
              </div>
              {opsGroups.map((g) => (
                <div key={g.key} className="rounded-xl border border-border p-2 text-center">
                  <p className="text-lg font-bold tabular-nums text-foreground">
                    {breakdown.counts[g.key] ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{g.label}</p>
                </div>
              ))}
            </div>
          ) : null}



          {!isBreak ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-bold">الحالة التشغيلية للمتحدثين</p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-xs font-medium",
                    readinessClasses[readiness.key],
                  )}
                >
                  {readiness.label}
                  {readiness.hint ? ` — ${readiness.hint}` : ""}
                </span>
              </div>
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا يوجد مشاركون مرتبطون بعد.</p>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {participants.map((p) => {
                    const ops = p.speaker_id ? opsMap?.get(p.speaker_id) : undefined;
                    return (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {p.display_name || p.speakers?.full_name || "غير محدد"}
                            {moderatorRoles.includes(p.role as ParticipantRole) ? (
                              <Badge variant="outline" className="ms-2 text-[11px]">
                                {participantRoleLabels[p.role as ParticipantRole] ?? p.role}
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {participantRoleLabels[p.role as ParticipantRole] ?? p.role}
                            {ops?.hotel ? ` — ${ops.hotel}${ops.room ? ` / غرفة ${ops.room}` : ""}` : ""}
                            {canEdit && ops?.phone ? ` — ${ops.phone}` : ""}
                          </p>
                        </div>
                        <Badge variant={p.match_status === "needs_matching" ? "destructive" : "secondary"}>
                          {p.match_status === "needs_matching"
                            ? "يحتاج مطابقة"
                            : (opStatusLabels[ops?.status ?? "not_arrived"] ?? "لم يصل")}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          {canEdit || isAdmin ? (
            <div className="flex justify-start">
              <Button onClick={() => onEdit(session)}>تعديل الجلسة</Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
