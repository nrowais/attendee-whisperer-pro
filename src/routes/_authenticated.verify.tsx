import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  PlaneLanding,
  PlaneTakeoff,
  AlertTriangle,
  CheckCircle2,
  Search,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const db = supabase as any;

const STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدول",
  arrived: "وصل المطار",
  in_transport: "في النقل",
  at_hotel: "في الفندق",
  at_event: "في الفعالية",
  departed: "غادر",
  cancelled: "ملغي",
};

type SpeakerRow = {
  id: string;
  full_name: string;
  organization: string | null;
  opStatus: string;
  arrivalTime: string | null;
  departureTime: string | null;
  arrivalActual: string | null;
  departureActual: string | null;
  checks: { label: string; ok: boolean }[];
};

export const Route = createFileRoute("/_authenticated/verify")({
  head: () => ({
    meta: [
      { title: "التحقق من الحالات — حوار الأمن والتاريخ" },
      {
        name: "description",
        content: "مطابقة أعداد المتحدثين المجدولين والواصلين والمغادرين مع الحالة التشغيلية المحفوظة.",
      },
      { property: "og:title", content: "التحقق من الحالات — حوار الأمن والتاريخ" },
      {
        property: "og:description",
        content: "مطابقة الأعداد المجدولة مع الحالة التشغيلية المحفوظة لكل متحدث.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

function useVerifyData() {
  return useQuery({
    queryKey: ["verify-ops"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [{ data: speakers }, { data: arrivals }, { data: departures }, { data: ops }] =
        await Promise.all([
          db.from("speakers").select("id, full_name, organization"),
          db.from("speaker_arrivals").select("speaker_id, arrival_time, status"),
          db.from("speaker_departures").select("speaker_id, departure_time, status"),
          db
            .from("guest_operations")
            .select(
              "speaker_id, operational_status, arrival_actual_time, departure_actual_time, hotel_checkin_at",
            ),
        ]);

      const arrivalMap = new Map<string, any>();
      for (const a of arrivals ?? []) {
        if (!arrivalMap.has(a.speaker_id)) arrivalMap.set(a.speaker_id, a);
      }
      const departureMap = new Map<string, any>();
      for (const d of departures ?? []) {
        if (!departureMap.has(d.speaker_id)) departureMap.set(d.speaker_id, d);
      }
      const opMap = new Map<string, any>();
      for (const o of ops ?? []) opMap.set(o.speaker_id, o);

      const rows: SpeakerRow[] = (speakers ?? []).map((s: any) => {
        const arr = arrivalMap.get(s.id);
        const dep = departureMap.get(s.id);
        const op = opMap.get(s.id);
        const opStatus: string = op?.operational_status ?? "scheduled";

        const checks: { label: string; ok: boolean }[] = [];
        if (arr?.arrival_time) {
          const past = new Date(arr.arrival_time).getTime() < Date.now();
          checks.push({
            label: "وصول مجدول",
            ok: !past || opStatus !== "scheduled" || Boolean(op?.arrival_actual_time),
          });
        }
        if (dep?.departure_time) {
          const past = new Date(dep.departure_time).getTime() < Date.now();
          checks.push({
            label: "مغادرة مجدولة",
            ok: !past || opStatus === "departed" || Boolean(op?.departure_actual_time),
          });
        }
        if (op?.arrival_actual_time) {
          checks.push({ label: "وصول مسجل", ok: opStatus !== "scheduled" });
        }
        if (op?.departure_actual_time) {
          checks.push({ label: "مغادرة مسجلة", ok: opStatus === "departed" });
        }

        return {
          id: s.id,
          full_name: s.full_name,
          organization: s.organization,
          opStatus,
          arrivalTime: arr?.arrival_time ?? null,
          departureTime: dep?.departure_time ?? null,
          arrivalActual: op?.arrival_actual_time ?? null,
          departureActual: op?.departure_actual_time ?? null,
          checks,
        };
      });

      return rows;
    },
  });
}

function VerifyPage() {
  const { data, isLoading } = useVerifyData();
  const [query, setQuery] = useState("");
  const [showMismatchesOnly, setShowMismatchesOnly] = useState(false);

  const summary = useMemo(() => {
    const rows = data ?? [];
    const scheduledArrivals = rows.filter((r) => r.arrivalTime).length;
    const scheduledDepartures = rows.filter((r) => r.departureTime).length;
    const arrived = rows.filter((r) =>
      ["arrived", "in_transport", "at_hotel", "at_event"].includes(r.opStatus),
    ).length;
    const departed = rows.filter((r) => r.opStatus === "departed").length;
    const stillScheduled = rows.filter((r) => r.opStatus === "scheduled").length;
    const mismatches = rows.filter((r) => r.checks.some((c) => !c.ok));
    return {
      total: rows.length,
      scheduledArrivals,
      scheduledDepartures,
      arrived,
      departed,
      stillScheduled,
      mismatches,
    };
  }, [data]);

  const rows = useMemo(() => {
    return (data ?? []).filter((r) => {
      if (showMismatchesOnly && !r.checks.some((c) => !c.ok)) return false;
      if (query.trim()) {
        const hay = `${r.full_name} ${r.organization ?? ""}`;
        if (!hay.includes(query.trim())) return false;
      }
      return true;
    });
  }, [data, query, showMismatchesOnly]);

  const cards = [
    { label: "إجمالي المتحدثين", value: summary.total, icon: ShieldCheck },
    { label: "وصول مجدول", value: summary.scheduledArrivals, icon: PlaneLanding },
    { label: "مغادرة مجدولة", value: summary.scheduledDepartures, icon: PlaneTakeoff },
    { label: "وصل (فعلياً)", value: summary.arrived, icon: CheckCircle2 },
    { label: "غادر (فعلياً)", value: summary.departed, icon: PlaneTakeoff },
    { label: "ما زال مجدولاً", value: summary.stillScheduled, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">التحقق من الحالات</h1>
        <p className="text-sm text-muted-foreground">
          مطابقة أعداد المتحدثين المجدولين والواصلين والمغادرين مع الحالة التشغيلية المحفوظة في
          قاعدة البيانات، ورصد أي فروقات. يُحدَّث تلقائياً من{" "}
          <Link to="/operations" className="font-semibold text-primary underline-offset-4 hover:underline">
            الحالة التشغيلية
          </Link>
          .
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <c.icon className="mb-2 h-4 w-4 text-primary" />
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowMismatchesOnly((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl border p-4 transition-colors",
          summary.mismatches.length > 0
            ? "border-destructive/40 bg-destructive/10"
            : "border-border bg-card",
          showMismatchesOnly && "ring-2 ring-primary",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          حالات غير متطابقة (فروقات بين الجدولة والحالة المحفوظة)
        </span>
        <span className="text-xl font-bold text-foreground">{summary.mismatches.length}</span>
      </button>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            سجل المطابقة لكل متحدث {showMismatchesOnly && "(الفروقات فقط)"}
          </h2>
          <div className="relative min-w-56 flex-1 sm:max-w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالاسم أو الجهة..."
              className="pr-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {showMismatchesOnly ? "لا توجد فروقات — كل الحالات متطابقة" : "لا توجد بيانات مطابقة"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="p-2 text-right font-medium">المتحدث</th>
                  <th className="p-2 text-right font-medium">الوصول المجدول</th>
                  <th className="p-2 text-right font-medium">المغادرة المجدولة</th>
                  <th className="p-2 text-right font-medium">الحالة المحفوظة</th>
                  <th className="p-2 text-right font-medium">الوصول الفعلي</th>
                  <th className="p-2 text-right font-medium">المغادرة الفعلية</th>
                  <th className="p-2 text-right font-medium">الفحوصات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="p-2">
                      <p className="font-semibold text-foreground">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">{r.organization ?? "—"}</p>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.arrivalTime ? new Date(r.arrivalTime).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.departureTime ? new Date(r.departureTime).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="p-2">
                      <Badge variant={r.opStatus === "departed" ? "outline" : "secondary"}>
                        {STATUS_LABELS[r.opStatus] ?? r.opStatus}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.arrivalActual ? new Date(r.arrivalActual).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {r.departureActual ? new Date(r.departureActual).toLocaleString("ar-SA") : "—"}
                    </td>
                    <td className="p-2">
                      {r.checks.length === 0 ? (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.checks.map((c) => (
                            <Badge
                              key={c.label}
                              variant={c.ok ? "secondary" : "destructive"}
                              className="text-[10px]"
                            >
                              {c.label} {c.ok ? "✓" : "✗"}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
