import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarClock, Mic, Plus } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";

const db = supabase as any;

function fmtClock(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("ar-SA-u-ca-gregory", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtCountdown(ms: number) {
  const total = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useTodaySessions() {
  return useQuery({
    queryKey: ["today-sessions"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const { data, error } = await db
        .from("speaker_sessions")
        .select("id, session_title, hall, starts_at, ends_at, notes, speakers(id, full_name, title)")
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

function useSpeakers() {
  return useQuery({
    queryKey: ["speakers-list"],
    queryFn: async () => {
      const { data, error } = await db.from("speakers").select("id, full_name").order("full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });
}

function useEvents() {
  return useQuery({
    queryKey: ["events-list"],
    queryFn: async () => {
      const { data, error } = await db.from("events").select("id, name").order("start_date");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

function toIso(local: string) {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function TodaysSessions() {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useTodaySessions();
  const { data: speakers } = useSpeakers();
  const { data: events } = useEvents();

  const [open, setOpen] = useState(false);
  const [eventId, setEventId] = useState("");
  const [speakerId, setSpeakerId] = useState("");
  const [title, setTitle] = useState("");
  const [hall, setHall] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const addSession = useMutation({
    mutationFn: async () => {
      const startIso = toIso(startsAt);
      if (!eventId) throw new Error("اختر الفعالية");
      if (!speakerId) throw new Error("اختر المتحدث");
      if (!title.trim()) throw new Error("أدخل عنوان الجلسة");
      if (!startIso) throw new Error("حدد وقت البداية");
      const { error } = await db.from("speaker_sessions").insert({
        event_id: eventId,
        speaker_id: speakerId,
        session_title: title.trim(),
        hall: hall.trim() || null,
        starts_at: startIso,
        ends_at: toIso(endsAt),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تمت إضافة الجلسة وربطها بالمتحدث");
      queryClient.invalidateQueries({ queryKey: ["today-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["crud", "speaker_sessions"] });
      setOpen(false);
      setSpeakerId("");
      setTitle("");
      setHall("");
      setStartsAt("");
      setEndsAt("");
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر حفظ الجلسة"),
  });

  const now = Date.now();

  return (
    <section className="surface-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-secondary p-2 text-primary">
            <CalendarClock className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-bold text-foreground">جلسات اليوم</p>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long", day: "numeric", month: "long" })}
              {" — "}
              {sessions?.length ?? 0} جلسة
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="size-4" />
                إضافة جلسة
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة جلسة وربطها بمتحدث</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="space-y-1.5">
                  <Label>الفعالية</Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفعالية" />
                    </SelectTrigger>
                    <SelectContent>
                      {(events ?? []).map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>المتحدث</Label>
                  <Select value={speakerId} onValueChange={setSpeakerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المتحدث" />
                    </SelectTrigger>
                    <SelectContent>
                      {(speakers ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>عنوان الجلسة</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: الجلسة الافتتاحية" />
                </div>
                <div className="space-y-1.5">
                  <Label>القاعة</Label>
                  <Input value={hall} onChange={(e) => setHall(e.target.value)} placeholder="مثال: القاعة الكبرى" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>وقت البداية</Label>
                    <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>وقت النهاية</Label>
                    <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => addSession.mutate()} disabled={addSession.isPending}>
                  {addSession.isPending ? "جارٍ الحفظ…" : "حفظ الجلسة"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/speakers">
              الكل <ArrowLeft className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          لا توجد جلسات مجدولة اليوم — أضف جلسة واربطها بمتحدث من الزر أعلاه
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sessions.map((s) => {
            const startMs = s.starts_at ? new Date(s.starts_at).getTime() : null;
            const endMs = s.ends_at ? new Date(s.ends_at).getTime() : null;
            const live = startMs !== null && now >= startMs && (endMs === null || now <= endMs);
            const done = endMs !== null && now > endMs;
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 text-center">
                    <p className="font-display text-sm font-bold tabular-nums text-primary">{fmtClock(s.starts_at)}</p>
                    {s.ends_at && (
                      <p className="text-[11px] tabular-nums text-muted-foreground">إلى {fmtClock(s.ends_at)}</p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.session_title ?? "جلسة"}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Mic className="size-3" />
                      {s.speakers?.full_name ?? "بدون متحدث"}
                      {s.hall ? ` — ${s.hall}` : ""}
                    </p>
                  </div>
                </div>
                {live ? (
                  <Badge className="shrink-0 gap-1.5">
                    <span className="size-1.5 animate-pulse rounded-full bg-current" />
                    جارية الآن
                  </Badge>
                ) : done ? (
                  <Badge variant="secondary" className="shrink-0">
                    انتهت
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">
                    قادمة
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
