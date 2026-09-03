import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export function MatchingQueue({ sessions }: { sessions: SessionRow[] }) {
  const queryClient = useQueryClient();
  const { data: speakers } = useSpeakersList();
  const { canEdit } = useRoles();
  const [query, setQuery] = useState("");
  const [picks, setPicks] = useState<Record<string, string>>({});

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

  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-sm text-muted-foreground">
        الأسماء التالية غير مرتبطة بسجل متحدث مؤكد. الاقتراحات للاسترشاد فقط — لا يتم الدمج تلقائيًا
        ولا يتم إنشاء أي متحدث جديد.
      </p>
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
                      <Badge variant={selectedScore >= 0.8 ? "secondary" : "outline"}>
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
    </div>
  );
}
