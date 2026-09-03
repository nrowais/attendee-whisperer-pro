import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/hooks/useAuth";
import { normalizeName } from "@/lib/sessions";
import { useSpeakersList, type SessionRow } from "./data";

const db = supabase as any;

export function MatchingQueue({ sessions }: { sessions: SessionRow[] }) {
  const queryClient = useQueryClient();
  const { data: speakers } = useSpeakersList();
  const { canEdit } = useRoles();

  const pending = sessions.flatMap((s) =>
    (s.session_participants ?? [])
      .filter((p) => !p.speaker_id || p.match_status === "needs_matching")
      .map((p) => ({ session: s, participant: p })),
  );

  const link = useMutation({
    mutationFn: async ({ id, speakerId }: { id: string; speakerId: string }) => {
      const { error } = await db
        .from("session_participants")
        .update({ speaker_id: speakerId, match_status: "matched" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم ربط المشارك بالمتحدث");
      queryClient.invalidateQueries({ queryKey: ["sessions-map"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر الربط"),
  });

  if (!pending.length) {
    return (
      <p className="surface-card p-8 text-center text-sm text-muted-foreground">
        لا توجد أسماء بحاجة إلى مطابقة — جميع المشاركين مرتبطون بسجلات المتحدثين.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        الأسماء التالية غير مرتبطة بسجل متحدث مؤكد. اختر المتحدث الصحيح يدويًا — لا يتم الربط أو
        الدمج تلقائيًا.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {pending.map(({ session, participant }) => {
          const normalized = normalizeName(participant.display_name);
          const suggestions = (speakers ?? []).filter(
            (s) => normalized && normalizeName(s.full_name).includes(normalized.split(" ")[0]),
          );
          return (
            <li key={participant.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_260px]">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {participant.display_name || "بدون اسم (TBD)"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.title_ar || "جلسة"} — {session.session_date}
                  {suggestions.length ? ` · اقتراحات: ${suggestions.slice(0, 3).map((s) => s.full_name).join("، ")}` : ""}
                </p>
              </div>
              {canEdit ? (
                <Select onValueChange={(v) => link.mutate({ id: participant.id, speakerId: v })}>
                  <SelectTrigger><SelectValue placeholder="اربط بمتحدث" /></SelectTrigger>
                  <SelectContent>
                    {(speakers ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  لا تملك صلاحية المطابقة
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
