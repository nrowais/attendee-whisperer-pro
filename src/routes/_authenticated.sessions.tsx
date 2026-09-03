import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Monitor, Plus, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoles } from "@/hooks/useAuth";
import {
  conferenceDays,
  normalizeName,
  riyadhToday,
  sessionStatusLabels,
  sessionTypeLabels,
  type SessionStatus,
  type SessionType,
} from "@/lib/sessions";
import { cn } from "@/lib/utils";
import { useSessions, useSpeakerOps, useTracks, type SessionRow } from "@/components/sessions/data";
import { SessionsTimeline } from "@/components/sessions/SessionsTimeline";
import { SessionDetail } from "@/components/sessions/SessionDetail";
import { SessionEditDialog } from "@/components/sessions/SessionEditDialog";
import { NowView } from "@/components/sessions/NowView";
import { UpcomingView } from "@/components/sessions/UpcomingView";
import { MatchingQueue } from "@/components/sessions/MatchingQueue";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({
    meta: [
      { title: "خريطة الجلسات — حوار الأمن والتاريخ" },
      {
        name: "description",
        content:
          "خريطة زمنية تشغيلية لجلسات مؤتمر حوار الأمن والتاريخ على مساري منصة الحوار ومسرح الأمن والتاريخ.",
      },
      { property: "og:title", content: "خريطة الجلسات — حوار الأمن والتاريخ" },
      { property: "og:description", content: "الجلسات الجارية والقادمة وجاهزية المتحدثين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SessionsPage,
});

const views = [
  { key: "map", label: "خريطة الجلسات" },
  { key: "now", label: "الآن" },
  { key: "upcoming", label: "الجلسات القادمة" },
  { key: "matching", label: "مطابقة المتحدثين" },
  { key: "gaps", label: "بيانات تحتاج استكمال" },
] as const;


function SessionsPage() {
  const { canEdit } = useRoles();
  const { data: tracks } = useTracks();
  const { data: sessions, isLoading } = useSessions();
  const { data: opsMap } = useSpeakerOps();

  const { data: eventId } = useQuery({
    queryKey: ["sessions-event-id"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("events")
        .select("id, name, start_date")
        .order("start_date", { ascending: true })
        .limit(1);
      return (data?.[0]?.id as string) ?? null;
    },
  });

  const today = riyadhToday();
  const [day, setDay] = useState(
    conferenceDays.find((d) => d.date === today)?.date ?? conferenceDays[0]!.date,
  );
  const [view, setView] = useState<(typeof views)[number]["key"]>("map");
  const [search, setSearch] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detail, setDetail] = useState<SessionRow | null>(null);
  const [editing, setEditing] = useState<SessionRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const all = sessions ?? [];

  const filtered = useMemo(() => {
    const q = normalizeName(search);
    return all.filter((s) => {
      if (trackFilter !== "all" && s.track_id !== trackFilter) return false;
      if (typeFilter !== "all" && s.session_type !== typeFilter) return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        s.title_ar,
        s.title_en,
        s.topic,
        s.partner_text,
        ...(s.session_participants ?? []).map((p) => p.display_name ?? p.speakers?.full_name ?? ""),
      ]
        .map((v) => normalizeName(v))
        .join(" ");
      return haystack.includes(q);
    });
  }, [all, search, trackFilter, typeFilter, statusFilter]);

  const dayed = filtered.filter((s) => s.session_date === day);

  // تحديث الجلسة المفتوحة عند وصول بيانات جديدة
  useEffect(() => {
    if (!detail) return;
    const fresh = all.find((s) => s.id === detail.id);
    if (fresh && fresh !== detail) setDetail(fresh);
  }, [all, detail]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">خريطة الجلسات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الخريطة الزمنية التشغيلية لمساري منصة الحوار ومسرح الأمن والتاريخ — بتوقيت الرياض.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link to="/sessions-live">
              <Monitor className="size-4" /> شاشة الجلسات المباشرة
            </Link>
          </Button>
          {canEdit ? (
            <Button
              onClick={() => {
                setEditing(null);
                setEditOpen(true);
              }}
            >
              <Plus className="size-4" /> إضافة جلسة
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-secondary/60 p-1">
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              view === v.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "map" ? (
        <div className="flex flex-wrap items-center gap-2">
          {conferenceDays.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setDay(d.date)}
              className={cn(
                "rounded-xl border px-4 py-2 text-start text-sm transition-colors",
                day === d.date
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="block font-semibold">{d.label}</span>
              <span className="block text-[11px] opacity-80">{d.sub}</span>
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() =>
              setDay(conferenceDays.find((d) => d.date === today)?.date ?? conferenceDays[0]!.date)
            }
          >
            <CalendarRange className="size-4" /> اليوم الحالي
          </Button>
        </div>
      ) : null}

      {view !== "matching" ? (
        <div className="grid gap-2 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
            <Input
              className="ps-9"
              placeholder="ابحث باسم الجلسة أو المتحدث أو مدير الجلسة أو الجهة"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={trackFilter} onValueChange={setTrackFilter}>
            <SelectTrigger><SelectValue placeholder="المسار" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المسارات</SelectItem>
              {(tracks ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger><SelectValue placeholder="نوع الجلسة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              {Object.entries(sessionTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {Object.entries(sessionStatusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : view === "map" ? (
        <SessionsTimeline
          sessions={dayed}
          tracks={tracks ?? []}
          now={now}
          opsMap={opsMap}
          onOpen={setDetail}
        />
      ) : view === "now" ? (
        <NowView sessions={filtered} tracks={tracks ?? []} now={now} opsMap={opsMap} onOpen={setDetail} />
      ) : view === "upcoming" ? (
        <UpcomingView sessions={filtered} tracks={tracks ?? []} now={now} opsMap={opsMap} onOpen={setDetail} />
      ) : view === "gaps" ? (
        <GapsView sessions={filtered} tracks={tracks ?? []} onOpen={setDetail} />
      ) : (
        <MatchingQueue sessions={all} />
      )}


      <SessionDetail
        session={detail}
        tracks={tracks ?? []}
        opsMap={opsMap}
        now={now}
        onClose={() => setDetail(null)}
        onEdit={(s) => {
          setDetail(null);
          setEditing(s);
          setEditOpen(true);
        }}
      />

      <SessionEditDialog
        open={editOpen}
        session={editing}
        tracks={tracks ?? []}
        allSessions={all}
        eventId={eventId ?? null}
        defaultDate={day}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditing(null);
        }}
      />
    </div>
  );
}
