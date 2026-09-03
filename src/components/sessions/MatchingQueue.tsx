import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Plus, Sparkles, Trash2, Unlink, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/hooks/useAuth";
import { confidenceLabel, matchConfidence, normalizeName } from "@/lib/sessions";
import { logSessionChange, useSpeakersList, type SessionRow } from "./data";

const db = supabase as any;

const HIGH_CONFIDENCE = 0.8;

const ROLE_OPTIONS = [
  { value: "speaker", label: "متحدث" },
  { value: "moderator", label: "مدير الجلسة" },
  { value: "interviewer", label: "محاور" },
  { value: "host", label: "مقدم" },
  { value: "guest", label: "ضيف" },
];

const roleLabel = (role: string) => ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;

export function MatchingQueue({ sessions }: { sessions: SessionRow[] }) {
  const queryClient = useQueryClient();
  const { data: speakers } = useSpeakersList();
  const { canEdit, isAdmin } = useRoles();
  const [query, setQuery] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [newSession, setNewSession] = useState("");
  const [newSpeaker, setNewSpeaker] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("speaker");

  const pending = useMemo(() => {
    const q = normalizeName(query);
    const list = sessions.flatMap((s) =>
      (s.session_participants ?? [])
        .filter((p) => !p.speaker_id && p.match_status === "needs_matching")
        .map((p) => {
          const ranked = (speakers ?? [])
            .map((sp) => ({ sp, score: matchConfidence(p.display_name, sp.full_name) }))
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score);
          return { session: s, participant: p, ranked };
        }),
    );
    if (!q) return list;
    return list.filter(
      (r) =>
        normalizeName(r.participant.display_name).includes(q) ||
        normalizeName(r.session.title_ar).includes(q),
    );
  }, [sessions, speakers, query]);

  const matched = useMemo(() => {
    const q = normalizeName(query);
    const list = sessions.flatMap((s) =>
      (s.session_participants ?? [])
        .filter((p) => !!p.speaker_id)
        .map((p) => ({ session: s, participant: p })),
    );
    if (!q) return list;
    return list.filter(
      (r) =>
        normalizeName(r.participant.display_name).includes(q) ||
        normalizeName(r.participant.speakers?.full_name).includes(q) ||
        normalizeName(r.session.title_ar).includes(q),
    );
  }, [sessions, query]);

  const highConfidence = useMemo(
    () => pending.filter((r) => (r.ranked[0]?.score ?? 0) >= HIGH_CONFIDENCE),
    [pending],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["sessions-map"] });
    queryClient.invalidateQueries({ queryKey: ["sessions-speaker-ops"] });
  };

  const confirm = useMutation({
    mutationFn: async ({
      id,
      speakerId,
      sessionId,
      name,
      speakerName,
      score,
    }: {
      id: string;
      speakerId: string;
      sessionId: string;
      name: string | null;
      speakerName: string;
      score: number;
    }) => {
      const { error } = await db
        .from("session_participants")
        .update({ speaker_id: speakerId, match_status: "matched" })
        .eq("id", id);
      if (error) throw error;
      await logSessionChange(sessionId, "participant_matched", {
        participant_id: id,
        participant_name: name,
        speaker_id: speakerId,
        speaker_name: speakerName,
        confidence: score,
      });
    },
    onSuccess: () => {
      toast.success("تم تأكيد المطابقة وتسجيلها في سجل النشاط");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر الربط"),
  });

  const confirmHigh = useMutation({
    mutationFn: async () => {
      let count = 0;
      for (const row of highConfidence) {
        const best = row.ranked[0];
        if (!best) continue;
        const { error } = await db
          .from("session_participants")
          .update({ speaker_id: best.sp.id, match_status: "matched" })
          .eq("id", row.participant.id);
        if (error) throw error;
        await logSessionChange(row.session.id, "participant_matched", {
          participant_id: row.participant.id,
          participant_name: row.participant.display_name,
          speaker_id: best.sp.id,
          speaker_name: best.sp.full_name,
          confidence: best.score,
          bulk: true,
        });
        count += 1;
      }
      return count;
    },
    onSuccess: (count) => {
      toast.success(`تم ربط ${count} اسمًا ذا ثقة عالية`);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر الربط الجماعي"),
  });

  const reject = useMutation({
    mutationFn: async ({
      id,
      sessionId,
      name,
    }: {
      id: string;
      sessionId: string;
      name: string | null;
    }) => {
      const { error } = await db
        .from("session_participants")
        .update({ match_status: "unconfirmed" })
        .eq("id", id);
      if (error) throw error;
      await logSessionChange(sessionId, "participant_match_rejected", {
        participant_id: id,
        participant_name: name,
      });
    },
    onSuccess: () => {
      toast.success("تم رفض الاقتراح — الاسم محفوظ كما ورد في المصدر");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر الحفظ"),
  });

  const relink = useMutation({
    mutationFn: async ({
      id,
      sessionId,
      speakerId,
      speakerName,
    }: {
      id: string;
      sessionId: string;
      speakerId: string | null;
      speakerName: string | null;
    }) => {
      const { error } = await db
        .from("session_participants")
        .update({
          speaker_id: speakerId,
          match_status: speakerId ? "matched" : "needs_matching",
        })
        .eq("id", id);
      if (error) throw error;
      await logSessionChange(sessionId, speakerId ? "participant_relinked" : "participant_unlinked", {
        participant_id: id,
        speaker_id: speakerId,
        speaker_name: speakerName,
      });
    },
    onSuccess: () => {
      toast.success("تم تحديث ربط المشارك");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر التحديث"),
  });

  const removeParticipant = useMutation({
    mutationFn: async ({
      id,
      sessionId,
      name,
    }: {
      id: string;
      sessionId: string;
      name: string | null;
    }) => {
      const { error } = await db.from("session_participants").delete().eq("id", id);
      if (error) throw error;
      await logSessionChange(sessionId, "participant_deleted", {
        participant_id: id,
        participant_name: name,
      });
    },
    onSuccess: () => {
      toast.success("تم حذف المشارك من الجلسة");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر الحذف"),
  });

  const addParticipant = useMutation({
    mutationFn: async () => {
      const session = sessions.find((s) => s.id === newSession);
      if (!session) throw new Error("اختر الجلسة أولًا");
      const speaker = (speakers ?? []).find((s) => s.id === newSpeaker);
      const name = newName.trim() || speaker?.full_name || "";
      if (!name) throw new Error("أدخل اسمًا أو اختر متحدثًا");
      const sortOrder = (session.session_participants ?? []).length;
      const { error } = await db.from("session_participants").insert({
        session_id: session.id,
        speaker_id: speaker?.id ?? null,
        display_name: name,
        role: newRole,
        match_status: speaker ? "matched" : "needs_matching",
        sort_order: sortOrder,
      });
      if (error) throw error;
      await logSessionChange(session.id, "participant_added", {
        participant_name: name,
        speaker_id: speaker?.id ?? null,
        role: newRole,
      });
    },
    onSuccess: () => {
      toast.success("تمت إضافة المشارك");
      setAddOpen(false);
      setNewSpeaker("");
      setNewName("");
      setNewRole("speaker");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذرت الإضافة"),
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          الاقتراحات للاسترشاد — لا يتم إنشاء أي متحدث جديد تلقائيًا. يمكن للمشرف الربط والتعديل
          والإضافة والحذف.
        </p>
        {canEdit ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={!highConfidence.length || confirmHigh.isPending}
              onClick={() => confirmHigh.mutate()}
            >
              <Sparkles className="size-4" /> ربط الأسماء عالية الثقة ({highConfidence.length})
            </Button>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="size-4" /> إضافة مشارك
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة مشارك إلى جلسة</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Select value={newSession} onValueChange={setNewSession}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الجلسة" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.session_date} — {s.title_ar || "جلسة"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newSpeaker} onValueChange={setNewSpeaker}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر متحدثًا (اختياري)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(speakers ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="الاسم المعروض (اختياري إذا اخترت متحدثًا)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="الدور" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    disabled={addParticipant.isPending}
                    onClick={() => addParticipant.mutate()}
                  >
                    حفظ
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      <Input
        placeholder="ابحث باسم المشارك أو الجلسة"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {!pending.length ? (
        <p className="surface-card p-8 text-center text-sm text-muted-foreground">
          لا توجد أسماء بحاجة إلى مطابقة.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-start text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-start">مشارك الجلسة</th>
                <th className="p-3 text-start">المتحدث المقترح</th>
                <th className="p-3 text-start">درجة الثقة</th>
                <th className="p-3 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pending.map(({ session, participant, ranked }) => {
                const best = ranked[0];
                const selected = picks[participant.id] ?? best?.sp.id ?? "";
                const selectedScore =
                  ranked.find((r) => r.sp.id === selected)?.score ??
                  (selected
                    ? matchConfidence(
                        participant.display_name,
                        (speakers ?? []).find((s) => s.id === selected)?.full_name,
                      )
                    : 0);
                return (
                  <tr key={participant.id}>
                    <td className="p-3">
                      <p className="font-medium text-foreground">
                        {participant.display_name || "بدون اسم (TBD)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.title_ar || "جلسة"} — {session.session_date}
                      </p>
                    </td>
                    <td className="p-3">
                      <Select
                        value={selected}
                        onValueChange={(v) => setPicks((p) => ({ ...p, [participant.id]: v }))}
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="min-w-[200px]">
                          <SelectValue placeholder="اختر متحدثًا" />
                        </SelectTrigger>
                        <SelectContent>
                          {(speakers ?? []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Badge variant={selectedScore >= HIGH_CONFIDENCE ? "secondary" : "outline"}>
                        {confidenceLabel(selectedScore)}
                        {selectedScore ? ` · ${Math.round(selectedScore * 100)}%` : ""}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {canEdit ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={!selected || confirm.isPending}
                            onClick={() => {
                              const sp = (speakers ?? []).find((s) => s.id === selected);
                              if (!sp) return;
                              confirm.mutate({
                                id: participant.id,
                                speakerId: sp.id,
                                sessionId: session.id,
                                name: participant.display_name ?? null,
                                speakerName: sp.full_name,
                                score: selectedScore,
                              });
                            }}
                          >
                            <Check className="size-4" /> تأكيد
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reject.isPending}
                            onClick={() =>
                              reject.mutate({
                                id: participant.id,
                                sessionId: session.id,
                                name: participant.display_name ?? null,
                              })
                            }
                          >
                            <X className="size-4" /> رفض
                          </Button>
                          {isAdmin ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={removeParticipant.isPending}
                              onClick={() =>
                                removeParticipant.mutate({
                                  id: participant.id,
                                  sessionId: session.id,
                                  name: participant.display_name ?? null,
                                })
                              }
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">لا تملك صلاحية المطابقة</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          الأسماء المرتبطة ({matched.length})
        </h3>
        {!matched.length ? (
          <p className="surface-card p-6 text-center text-sm text-muted-foreground">
            لا توجد أسماء مرتبطة بعد.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-start text-sm">
              <thead className="bg-secondary/60 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-start">الاسم في الجلسة</th>
                  <th className="p-3 text-start">المتحدث المرتبط</th>
                  <th className="p-3 text-start">الدور</th>
                  <th className="p-3 text-start">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {matched.map(({ session, participant }) => (
                  <tr key={participant.id}>
                    <td className="p-3">
                      <p className="font-medium text-foreground">
                        {participant.display_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.title_ar || "جلسة"} — {session.session_date}
                      </p>
                    </td>
                    <td className="p-3">
                      <Select
                        value={participant.speaker_id ?? ""}
                        disabled={!canEdit || relink.isPending}
                        onValueChange={(v) => {
                          const sp = (speakers ?? []).find((s) => s.id === v);
                          relink.mutate({
                            id: participant.id,
                            sessionId: session.id,
                            speakerId: v,
                            speakerName: sp?.full_name ?? null,
                          });
                        }}
                      >
                        <SelectTrigger className="min-w-[200px]">
                          <SelectValue placeholder="اختر متحدثًا" />
                        </SelectTrigger>
                        <SelectContent>
                          {(speakers ?? []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{roleLabel(participant.role)}</Badge>
                    </td>
                    <td className="p-3">
                      {canEdit ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={relink.isPending}
                            onClick={() =>
                              relink.mutate({
                                id: participant.id,
                                sessionId: session.id,
                                speakerId: null,
                                speakerName: null,
                              })
                            }
                          >
                            <Unlink className="size-4" /> فك الربط
                          </Button>
                          {isAdmin ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={removeParticipant.isPending}
                              onClick={() =>
                                removeParticipant.mutate({
                                  id: participant.id,
                                  sessionId: session.id,
                                  name: participant.display_name ?? null,
                                })
                              }
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">للعرض فقط</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
