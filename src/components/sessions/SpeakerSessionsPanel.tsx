import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtTime, normalizeName, participantRoleLabels, type ParticipantRole } from "@/lib/sessions";
import { useSessions, useTracks } from "./data";

export function SpeakerSessionsPanel() {
  const { data: sessions, isLoading } = useSessions();
  const { data: tracks } = useTracks();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const out: {
      key: string;
      speaker: string;
      date: string;
      time: string;
      track: string;
      title: string;
      role: string;
    }[] = [];
    for (const s of sessions ?? []) {
      for (const p of s.session_participants ?? []) {
        out.push({
          key: p.id,
          speaker: p.speakers?.full_name || p.display_name || "غير محدد",
          date: s.session_date,
          time: fmtTime(s.start_time),
          track: tracks?.find((t) => t.id === s.track_id)?.name_ar ?? "—",
          title: s.title_ar || s.title_en || "بدون عنوان",
          role: participantRoleLabels[p.role as ParticipantRole] ?? p.role,
        });
      }
    }
    const q = normalizeName(query);
    return out
      .filter((r) => !q || normalizeName(r.speaker).includes(q) || normalizeName(r.title).includes(q))
      .sort((a, b) => (`${a.speaker}${a.date}${a.time}` < `${b.speaker}${b.date}${b.time}` ? -1 : 1));
  }, [sessions, tracks, query]);

  return (
    <div className="space-y-3" dir="rtl">
      <Input
        placeholder="ابحث باسم المتحدث أو عنوان الجلسة"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : rows.length === 0 ? (
        <p className="surface-card p-8 text-center text-sm text-muted-foreground">
          لا توجد جلسات مرتبطة بالمتحدثين بعد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-start text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-start">المتحدث</th>
                <th className="p-3 text-start">التاريخ</th>
                <th className="p-3 text-start">الوقت</th>
                <th className="p-3 text-start">المسار</th>
                <th className="p-3 text-start">عنوان الجلسة</th>
                <th className="p-3 text-start">الدور</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="p-3 font-medium text-foreground">{r.speaker}</td>
                  <td className="p-3 tabular-nums">{r.date}</td>
                  <td className="p-3 tabular-nums" dir="ltr">{r.time}</td>
                  <td className="p-3">{r.track}</td>
                  <td className="p-3">{r.title}</td>
                  <td className="p-3">{r.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
