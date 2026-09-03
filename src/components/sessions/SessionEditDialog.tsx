import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  diffMinutes,
  fmtTime,
  participantRoleLabels,
  sessionStatusLabels,
  sessionTypeLabels,
  type ParticipantRole,
  type SessionStatus,
  type SessionType,
} from "@/lib/sessions";
import { logSessionChange, useSpeakersList, type SessionRow, type TrackRow } from "./data";

const db = supabase as any;

type DraftParticipant = {
  key: string;
  id?: string;
  speaker_id: string | null;
  display_name: string;
  role: ParticipantRole;
  match_status: string;
};

export function SessionEditDialog({
  open,
  session,
  tracks,
  allSessions,
  eventId,
  defaultDate,
  onOpenChange,
}: {
  open: boolean;
  session: SessionRow | null;
  tracks: TrackRow[];
  allSessions: SessionRow[];
  eventId: string | null;
  defaultDate: string;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: speakers } = useSpeakersList();

  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [type, setType] = useState<SessionType>("panel_session");
  const [date, setDate] = useState(defaultDate);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [trackId, setTrackId] = useState("");
  const [topic, setTopic] = useState("");
  const [partner, setPartner] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<SessionStatus>("scheduled");
  const [parts, setParts] = useState<DraftParticipant[]>([]);
  const [confirmConflict, setConfirmConflict] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirmConflict(false);
    setTitleAr(session?.title_ar ?? "");
    setTitleEn(session?.title_en ?? "");
    setType((session?.session_type as SessionType) ?? "panel_session");
    setDate(session?.session_date ?? defaultDate);
    setStart(fmtTime(session?.start_time) === "—" ? "" : fmtTime(session?.start_time));
    setEnd(fmtTime(session?.end_time) === "—" ? "" : fmtTime(session?.end_time));
    setTrackId(session?.track_id ?? tracks[0]?.id ?? "");
    setTopic(session?.topic ?? "");
    setPartner(session?.partner_text ?? "");
    setNotes(session?.notes ?? "");
    setStatus((session?.status as SessionStatus) ?? "scheduled");
    setParts(
      (session?.session_participants ?? []).map((p, i) => ({
        key: `${p.id}-${i}`,
        id: p.id,
        speaker_id: p.speaker_id,
        display_name: p.display_name ?? p.speakers?.full_name ?? "",
        role: (p.role as ParticipantRole) ?? "speaker",
        match_status: p.match_status,
      })),
    );
  }, [open, session, defaultDate, tracks]);

  const duration = diffMinutes(start, end);

  const conflicts = useMemo(() => {
    if (!start || !trackId) return [];
    const s = start;
    const e = end || start;
    return allSessions.filter((other) => {
      if (other.id === session?.id) return false;
      if (other.track_id !== trackId || other.session_date !== date) return false;
      const os = fmtTime(other.start_time);
      const oe = fmtTime(other.end_time) === "—" ? os : fmtTime(other.end_time);
      return s < oe && os < e;
    });
  }, [allSessions, session?.id, trackId, date, start, end]);

  const save = useMutation({
    mutationFn: async () => {
      if (!date) throw new Error("حدد تاريخ الجلسة");
      if (start && end && start >= end) throw new Error("وقت البداية يجب أن يسبق وقت النهاية");
      if (conflicts.length && !confirmConflict) throw new Error("__conflict__");

      const payload = {
        event_id: session?.event_id ?? eventId,
        track_id: trackId || null,
        title_ar: titleAr.trim() || null,
        title_en: titleEn.trim() || null,
        session_type: type,
        session_date: date,
        start_time: start || null,
        end_time: end || null,
        duration_minutes: duration,
        topic: topic.trim() || null,
        partner_text: partner.trim() || null,
        notes: notes.trim() || null,
        status,
      };

      let sessionId = session?.id;
      if (sessionId) {
        const { error } = await db.from("sessions").update(payload).eq("id", sessionId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("sessions").insert(payload).select("id").single();
        if (error) throw error;
        sessionId = data.id as string;
      }

      const keptIds = parts.filter((p) => p.id).map((p) => p.id);
      const removed = (session?.session_participants ?? []).filter(
        (p) => !keptIds.includes(p.id),
      );
      if (removed.length) {
        const { error } = await db
          .from("session_participants")
          .delete()
          .in("id", removed.map((p) => p.id));
        if (error) throw error;
      }

      for (let i = 0; i < parts.length; i += 1) {
        const p = parts[i]!;
        const row = {
          session_id: sessionId,
          speaker_id: p.speaker_id,
          display_name: p.display_name.trim() || null,
          role: p.role,
          match_status: p.speaker_id ? "matched" : "needs_matching",
          sort_order: i,
        };
        if (p.id) {
          const { error } = await db.from("session_participants").update(row).eq("id", p.id);
          if (error) throw error;
        } else {
          const { error } = await db.from("session_participants").insert(row);
          if (error) throw error;
        }
      }

      await logSessionChange(sessionId!, session ? "update" : "create", {
        title: titleAr,
        old: session
          ? {
              start_time: session.start_time,
              end_time: session.end_time,
              session_date: session.session_date,
              status: session.status,
            }
          : null,
        new: { start_time: start, end_time: end, session_date: date, status },
        message: session
          ? `تم تعديل جلسة "${titleAr}"${
              session.start_time && fmtTime(session.start_time) !== start
                ? ` من ${fmtTime(session.start_time)} إلى ${start}`
                : ""
            }`
          : `تمت إضافة جلسة "${titleAr}"`,
      });
    },
    onSuccess: () => {
      toast.success("تم حفظ الجلسة");
      queryClient.invalidateQueries({ queryKey: ["sessions-map"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      onOpenChange(false);
    },
    onError: (e: any) => {
      if (e?.message === "__conflict__") {
        setConfirmConflict(true);
        toast.warning("توجد جلسة متعارضة في نفس المسار — اضغط حفظ مرة أخرى للتأكيد");
        return;
      }
      toast.error(e?.message ?? "تعذر حفظ الجلسة");
    },
  });

  const move = (index: number, dir: -1 | 1) => {
    setParts((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{session ? "تعديل الجلسة" : "إضافة جلسة"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>عنوان الجلسة (عربي)</Label>
              <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>العنوان (إنجليزي)</Label>
              <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>التاريخ</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>المسار</Label>
              <Select value={trackId} onValueChange={setTrackId}>
                <SelectTrigger><SelectValue placeholder="اختر المسار" /></SelectTrigger>
                <SelectContent>
                  {tracks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>وقت البداية</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>وقت النهاية</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>نوع الجلسة</Label>
              <Select value={type} onValueChange={(v) => setType(v as SessionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(sessionTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الحالة</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as SessionStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(sessionStatusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>الموضوع</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>الجهة المشاركة</Label>
              <Input value={partner} onChange={(e) => setPartner(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>الملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            المدة المحسوبة تلقائيًا: {duration ? `${duration} دقيقة` : "—"}
          </p>

          {conflicts.length ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                هذه الجلسة تتعارض مع{" "}
                {conflicts
                  .map(
                    (c) =>
                      `"${c.title_ar ?? "جلسة"}" من ${fmtTime(c.start_time)} إلى ${fmtTime(c.end_time)}`,
                  )
                  .join("، ")}{" "}
                في نفس المسار. {confirmConflict ? "اضغط حفظ لتأكيد الحفظ رغم التعارض." : ""}
              </span>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>المشاركون</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() =>
                  setParts((p) => [
                    ...p,
                    {
                      key: `new-${Date.now()}`,
                      speaker_id: null,
                      display_name: "",
                      role: "speaker",
                      match_status: "needs_matching",
                    },
                  ])
                }
              >
                <Plus className="size-4" /> إضافة مشارك
              </Button>
            </div>

            {parts.map((p, i) => (
              <div key={p.key} className="grid gap-2 rounded-xl border border-border p-2 sm:grid-cols-[1fr_150px_auto]">
                <Select
                  value={p.speaker_id ?? "none"}
                  onValueChange={(v) =>
                    setParts((prev) =>
                      prev.map((x, xi) =>
                        xi === i
                          ? {
                              ...x,
                              speaker_id: v === "none" ? null : v,
                              display_name:
                                v === "none"
                                  ? x.display_name
                                  : (speakers?.find((s) => s.id === v)?.full_name ?? x.display_name),
                            }
                          : x,
                      ),
                    )
                  }
                >
                  <SelectTrigger><SelectValue placeholder="اختر متحدثًا" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">غير مرتبط (يحتاج مطابقة)</SelectItem>
                    {(speakers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={p.role}
                  onValueChange={(v) =>
                    setParts((prev) =>
                      prev.map((x, xi) => (xi === i ? { ...x, role: v as ParticipantRole } : x)),
                    )
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(participantRoleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" onClick={() => move(i, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" onClick={() => move(i, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setParts((prev) => prev.filter((_, xi) => xi !== i))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <Input
                  className="sm:col-span-3"
                  placeholder="الاسم كما ورد في البرنامج (اختياري)"
                  value={p.display_name}
                  onChange={(e) =>
                    setParts((prev) =>
                      prev.map((x, xi) => (xi === i ? { ...x, display_name: e.target.value } : x)),
                    )
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "جارٍ الحفظ…" : confirmConflict ? "تأكيد الحفظ رغم التعارض" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
