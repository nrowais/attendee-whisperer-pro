import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Car,
  BedDouble,
  ClipboardList,
  UserCheck,
  Mic,
  Users,
  RefreshCw,
  BellRing,
  AlarmClock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { title: "شاشة المتابعة — عمليات ضيوف الفعالية" },
      {
        name: "description",
        content:
          "ملخص لحظي لحالة المتحدثين والوصول والمغادرة والنقل والإقامة والطلبات لمتابعة سير الفعالية.",
      },
      { property: "og:title", content: "شاشة المتابعة — عمليات ضيوف الفعالية" },
      {
        property: "og:description",
        content: "ملخص لحظي لحالة العمليات ومتابعة سير الفعالية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OverviewPage,
});

type Row = Record<string, any>;

const dtf = new Intl.DateTimeFormat("ar-SA", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dtf.format(d);
}

function statusTone(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (["completed", "arrived", "confirmed", "done", "checked_in"].includes(s))
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  if (["in_progress", "in_transit", "on_route", "assigned"].includes(s))
    return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
  if (["delayed", "urgent", "high", "issue"].includes(s))
    return "bg-red-500/10 text-red-600 dark:text-red-400";
  if (["pending", "scheduled", "planned", "open"].includes(s))
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

const statusLabels: Record<string, string> = {
  scheduled: "مجدول",
  planned: "مخطط",
  pending: "قيد الانتظار",
  in_progress: "قيد التنفيذ",
  in_transit: "في الطريق",
  completed: "مكتمل",
  arrived: "وصل",
  departed: "غادر",
  confirmed: "مؤكد",
  cancelled: "ملغي",
  delayed: "متأخر",
  open: "مفتوح",
  done: "منجز",
  checked_in: "تم التسجيل",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

function label(v?: string | null) {
  if (!v) return "—";
  return statusLabels[v] ?? v;
}

function useOverview() {
  return useQuery({
    queryKey: ["overview-live"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [
        speakers,
        invitees,
        arrivals,
        departures,
        trips,
        bookings,
        requests,
        attendance,
        invitations,
      ] = await Promise.all([
        supabase.from("speakers").select("id"),
        supabase.from("invitees").select("id"),
        supabase
          .from("speaker_arrivals")
          .select("id, status, arrival_time, arrival_point, speakers(full_name)")
          .order("arrival_time", { ascending: true }),
        supabase
          .from("speaker_departures")
          .select("id, status, departure_time, departure_point, speakers(full_name)")
          .order("departure_time", { ascending: true }),
        supabase
          .from("transport_trips")
          .select(
            "id, status, trip_type, scheduled_at, pickup_location, dropoff_location, speakers(full_name), drivers(full_name)",
          )
          .order("scheduled_at", { ascending: true }),
        supabase
          .from("hotel_bookings")
          .select(
            "id, status, check_in, check_out, speakers(full_name), hotels(name)",
          ),
        supabase
          .from("speaker_requests")
          .select("id, title, status, priority, created_at, speakers(full_name)")
          .order("created_at", { ascending: false }),
        supabase.from("attendance").select("id"),
        supabase.from("invitations").select("id, status"),
      ]);

      const err =
        speakers.error ||
        invitees.error ||
        arrivals.error ||
        departures.error ||
        trips.error ||
        bookings.error ||
        requests.error ||
        attendance.error ||
        invitations.error;
      if (err) throw err;

      return {
        speakers: speakers.data ?? [],
        invitees: invitees.data ?? [],
        arrivals: (arrivals.data ?? []) as Row[],
        departures: (departures.data ?? []) as Row[],
        trips: (trips.data ?? []) as Row[],
        bookings: (bookings.data ?? []) as Row[],
        requests: (requests.data ?? []) as Row[],
        attendance: attendance.data ?? [],
        invitations: (invitations.data ?? []) as Row[],
      };
    },
  });
}

function count(rows: Row[], key: string, values: string[]) {
  return rows.filter((r) => values.includes(String(r[key] ?? "").toLowerCase())).length;
}

type AlertItem = {
  id: string;
  kind: "arrival" | "departure" | "trip" | "checkin";
  title: string;
  person: string;
  place: string;
  at: Date;
  minutes: number;
  to: string;
};

const kindMeta: Record<
  AlertItem["kind"],
  { label: string; icon: typeof PlaneLanding; tone: string }
> = {
  arrival: { label: "وصول", icon: PlaneLanding, tone: "bg-sky-500/10 text-sky-600" },
  departure: { label: "مغادرة", icon: PlaneTakeoff, tone: "bg-violet-500/10 text-violet-600" },
  trip: { label: "نقل", icon: Car, tone: "bg-amber-500/10 text-amber-600" },
  checkin: { label: "تسجيل إقامة", icon: BedDouble, tone: "bg-emerald-500/10 text-emerald-600" },
};

const LEAD_KEY = "ops-alert-lead-minutes";

function minutesUntil(value: string | null | undefined, now: number) {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - now) / 60000);
}

/** موعد افتراضي لتسجيل الدخول للفندق: 3:00 عصراً */
function checkInDate(day: string | null | undefined) {
  if (!day) return null;
  const d = new Date(`${day}T15:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildAlerts(data: ReturnType<typeof useOverview>["data"], lead: number, now: number) {
  if (!data) return [] as AlertItem[];
  const out: AlertItem[] = [];
  const within = (m: number | null) => m !== null && m <= lead && m >= -30;

  for (const a of data.arrivals) {
    if (["arrived", "completed", "cancelled"].includes(String(a["status"] ?? "").toLowerCase()))
      continue;
    const m = minutesUntil(a["arrival_time"], now);
    if (!within(m)) continue;
    out.push({
      id: `arr-${a["id"]}`,
      kind: "arrival",
      title: "وصول مرتقب",
      person: a["speakers"]?.full_name ?? "—",
      place: a["arrival_point"] ?? "—",
      at: new Date(a["arrival_time"]),
      minutes: m as number,
      to: "/arrivals",
    });
  }

  for (const d of data.departures) {
    if (["departed", "completed", "cancelled"].includes(String(d["status"] ?? "").toLowerCase()))
      continue;
    const m = minutesUntil(d["departure_time"], now);
    if (!within(m)) continue;
    out.push({
      id: `dep-${d["id"]}`,
      kind: "departure",
      title: "مغادرة مرتقبة",
      person: d["speakers"]?.full_name ?? "—",
      place: d["departure_point"] ?? "—",
      at: new Date(d["departure_time"]),
      minutes: m as number,
      to: "/departures",
    });
  }

  for (const t of data.trips) {
    if (["completed", "cancelled"].includes(String(t["status"] ?? "").toLowerCase())) continue;
    const m = minutesUntil(t["scheduled_at"], now);
    if (!within(m)) continue;
    out.push({
      id: `trip-${t["id"]}`,
      kind: "trip",
      title: "تحرك نقل",
      person: t["speakers"]?.full_name ?? "—",
      place: `${t["pickup_location"] ?? "—"} ← ${t["dropoff_location"] ?? "—"}`,
      at: new Date(t["scheduled_at"]),
      minutes: m as number,
      to: "/trips",
    });
  }

  for (const b of data.bookings) {
    if (["checked_in", "cancelled", "completed"].includes(String(b["status"] ?? "").toLowerCase()))
      continue;
    const at = checkInDate(b["check_in"]);
    if (!at) continue;
    const m = Math.round((at.getTime() - now) / 60000);
    if (!within(m)) continue;
    out.push({
      id: `bk-${b["id"]}`,
      kind: "checkin",
      title: "تسجيل إقامة",
      person: b["speakers"]?.full_name ?? "—",
      place: b["hotels"]?.name ?? "—",
      at,
      minutes: m,
      to: "/bookings",
    });
  }

  return out.sort((a, b) => a.minutes - b.minutes);
}

function relative(minutes: number) {
  if (minutes < 0) return `متأخر ${Math.abs(minutes)} دقيقة`;
  if (minutes === 0) return "الآن";
  if (minutes < 60) return `بعد ${minutes} دقيقة`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `بعد ${h} ساعة و${m} دقيقة` : `بعد ${h} ساعة`;
}

function AlertsPanel({ data }: { data: ReturnType<typeof useOverview>["data"] }) {
  const [lead, setLead] = useState(60);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const saved = Number(localStorage.getItem(LEAD_KEY));
    if (saved > 0) setLead(saved);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const alerts = buildAlerts(data, lead, now);
  const urgent = alerts.filter((a) => a.minutes <= 15);

  return (
    <Card className={alerts.length ? "border-primary/40" : undefined}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className={`size-4 ${urgent.length ? "animate-pulse text-red-500" : "text-primary"}`} />
          تنبيهات قبل الموعد
          {alerts.length > 0 && (
            <Badge className="bg-primary/10 text-primary">{alerts.length}</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">مهلة التنبيه</span>
          <Select
            value={String(lead)}
            onValueChange={(v) => {
              setLead(Number(v));
              localStorage.setItem(LEAD_KEY, v);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">٣٠ دقيقة</SelectItem>
              <SelectItem value="60">ساعة واحدة</SelectItem>
              <SelectItem value="120">ساعتان</SelectItem>
              <SelectItem value="180">٣ ساعات</SelectItem>
              <SelectItem value="360">٦ ساعات</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            لا توجد مواعيد خلال المهلة المحددة — كل شيء تحت السيطرة.
          </p>
        ) : (
          alerts.map((a) => {
            const meta = kindMeta[a.kind];
            const late = a.minutes < 0;
            const soon = a.minutes >= 0 && a.minutes <= 15;
            return (
              <Link
                key={a.id}
                to={a.to as never}
                className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50 ${
                  late
                    ? "border-red-500/40 bg-red-500/5"
                    : soon
                      ? "border-amber-500/40 bg-amber-500/5"
                      : ""
                }`}
              >
                <span className={`flex size-10 items-center justify-center rounded-lg ${meta.tone}`}>
                  <meta.icon className="size-5" />
                </span>
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-semibold">
                    {a.title} — {a.person}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.place} · {fmt(a.at.toISOString())}
                  </p>
                </div>
                <Badge
                  className={
                    late
                      ? "bg-red-500/10 text-red-600"
                      : soon
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  <AlarmClock className="ms-1 size-3" />
                  {relative(a.minutes)}
                </Badge>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

type FlightAlertRow = {
  id: string;
  alert_type: "arrival" | "departure";
  status: "pending" | "acknowledged" | "dismissed";
  message: string;
  due_at: string;
  flights: { flight_number: string; airline: string; origin: string; destination: string } | null;
};

const FLIGHT_ALERT_WINDOW_KEY = "flight-alert-window-minutes";

function FlightAlertsPanel() {
  const { canEdit } = useRoles();
  const queryClient = useQueryClient();
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const saved = Number(localStorage.getItem(FLIGHT_ALERT_WINDOW_KEY));
    if (saved > 0) setWindowMinutes(saved);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["flight-alerts"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_alerts")
        .select("*, flights(flight_number, airline, origin, destination)")
        .in("status", ["pending", "acknowledged"])
        .order("due_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FlightAlertRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("flight_alerts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flight-alerts"] }),
  });

  const alerts = (data ?? []).filter((a) => {
    const m = minutesUntil(a.due_at, now);
    return m !== null && m <= windowMinutes && m >= -30;
  });

  const pending = alerts.filter((a) => a.status === "pending");
  const urgent = pending.filter((a) => {
    const m = minutesUntil(a.due_at, now);
    return m !== null && m <= 15;
  });

  return (
    <Card className={pending.length ? "border-destructive/30" : undefined}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plane
            className={`size-4 ${urgent.length ? "animate-pulse text-destructive" : "text-primary"}`}
          />
          تنبيهات الرحلات الجوية
          {pending.length > 0 && (
            <Badge className="bg-destructive/10 text-destructive">{pending.length}</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">نافذة التنبيه</span>
          <Select
            value={String(windowMinutes)}
            onValueChange={(v) => {
              setWindowMinutes(Number(v));
              localStorage.setItem(FLIGHT_ALERT_WINDOW_KEY, v);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">٣٠ دقيقة</SelectItem>
              <SelectItem value="60">ساعة واحدة</SelectItem>
              <SelectItem value="120">ساعتان</SelectItem>
              <SelectItem value="180">٣ ساعات</SelectItem>
              <SelectItem value="360">٦ ساعات</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2 py-4">
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            لا توجد تنبيهات رحلات ضمن النافذة المحددة.
          </p>
        ) : (
          alerts.map((a) => {
            const m = minutesUntil(a.due_at, now);
            const late = m !== null && m < 0;
            const soon = m !== null && m >= 0 && m <= 15;
            const isArrival = a.alert_type === "arrival";
            const Icon = isArrival ? PlaneLanding : PlaneTakeoff;
            return (
              <div
                key={a.id}
                className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors ${
                  late
                    ? "border-red-500/40 bg-red-500/5"
                    : soon
                      ? "border-amber-500/40 bg-amber-500/5"
                      : ""
                }`}
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-lg ${
                    isArrival
                      ? "bg-sky-500/10 text-sky-600"
                      : "bg-violet-500/10 text-violet-600"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-semibold">{a.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.flights?.flight_number
                      ? `${a.flights.airline} ${a.flights.flight_number}`
                      : null}
                    {a.flights?.flight_number ? " · " : null}
                    {fmt(a.due_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      late
                        ? "bg-red-500/10 text-red-600"
                        : soon
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-muted text-muted-foreground"
                    }
                  >
                    <AlarmClock className="ms-1 size-3" />
                    {m === null ? "—" : relative(m)}
                  </Badge>
                  {canEdit && a.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: a.id, status: "acknowledged" })}
                      >
                        تأكيد
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus.mutate({ id: a.id, status: "dismissed" })}
                      >
                        تجاهل
                      </Button>
                    </>
                  ) : a.status === "acknowledged" ? (
                    <Badge variant="secondary">تم التأكيد</Badge>
                  ) : a.status === "dismissed" ? (
                    <Badge variant="outline">متجاهل</Badge>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function OverviewPage() {
  const { data, isLoading, isFetching, refetch } = useOverview();


  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const arrivedCount = count(data.arrivals, "status", ["arrived", "completed"]);
  const arrivalsTotal = data.arrivals.length;
  const departedCount = count(data.departures, "status", ["departed", "completed"]);
  const departuresTotal = data.departures.length;
  const tripsActive = count(data.trips, "status", ["in_progress", "in_transit", "assigned"]);
  const tripsPending = count(data.trips, "status", ["scheduled", "planned", "pending"]);
  const bookingsConfirmed = count(data.bookings, "status", ["confirmed", "checked_in"]);
  const openRequests = data.requests.filter(
    (r) => !["completed", "done", "cancelled"].includes(String(r["status"] ?? "").toLowerCase()),
  );
  const accepted = count(data.invitations, "status", ["accepted", "confirmed"]);

  const kpis = [
    { label: "المتحدثون", value: data.speakers.length, icon: Mic, to: "/speakers" },
    { label: "المدعوون", value: data.invitees.length, icon: Users, to: "/invitees" },
    {
      label: "وصلوا",
      value: `${arrivedCount}/${arrivalsTotal}`,
      icon: PlaneLanding,
      to: "/arrivals",
    },
    {
      label: "غادروا",
      value: `${departedCount}/${departuresTotal}`,
      icon: PlaneTakeoff,
      to: "/departures",
    },
    { label: "رحلات نقل جارية", value: tripsActive, icon: Car, to: "/trips" },
    { label: "حجوزات مؤكدة", value: bookingsConfirmed, icon: BedDouble, to: "/bookings" },
    { label: "طلبات مفتوحة", value: openRequests.length, icon: ClipboardList, to: "/requests" },
    { label: "تم تسجيل حضورهم", value: data.attendance.length, icon: UserCheck, to: "/attendance" },
  ];

  const progress = [
    {
      label: "اكتمال الوصول",
      done: arrivedCount,
      total: Math.max(arrivalsTotal, 1),
    },
    {
      label: "اكتمال المغادرة",
      done: departedCount,
      total: Math.max(departuresTotal, 1),
    },
    {
      label: "الدعوات المؤكدة",
      done: accepted,
      total: Math.max(data.invitations.length, 1),
    },
    {
      label: "الطلبات المنجزة",
      done: data.requests.length - openRequests.length,
      total: Math.max(data.requests.length, 1),
    },
  ];

  const nextArrivals = [...data.arrivals]
    .filter((a) => !["arrived", "completed"].includes(String(a["status"] ?? "").toLowerCase()))
    .slice(0, 6);
  const nextTrips = [...data.trips]
    .filter((t) => !["completed", "cancelled"].includes(String(t["status"] ?? "").toLowerCase()))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">شاشة المتابعة</h1>
          <p className="text-sm text-muted-foreground">
            حالة العمليات لحظياً — تحديث تلقائي كل دقيقة
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`ms-2 size-4 ${isFetching ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </header>

      <AlertsPanel data={data} />

      <FlightAlertsPanel />


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to as never}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <k.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مؤشرات الإنجاز</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {progress.map((p) => {
            const pct = Math.round((p.done / p.total) * 100);
            return (
              <div key={p.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{p.label}</span>
                  <span className="text-muted-foreground">
                    {p.done} / {p.total} — {pct}%
                  </span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">وصول مرتقب</CardTitle>
            <Link to="/arrivals" className="text-sm text-primary hover:underline">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المتحدث</TableHead>
                  <TableHead>الموعد</TableHead>
                  <TableHead>النقطة</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nextArrivals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      لا يوجد وصول مرتقب
                    </TableCell>
                  </TableRow>
                ) : (
                  nextArrivals.map((a) => (
                    <TableRow key={a["id"]}>
                      <TableCell className="font-medium">
                        {a["speakers"]?.full_name ?? "—"}
                      </TableCell>
                      <TableCell>{fmt(a["arrival_time"])}</TableCell>
                      <TableCell>{a["arrival_point"] ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusTone(a["status"])}>
                          {label(a["status"])}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">حركات النقل</CardTitle>
            <Link to="/trips" className="text-sm text-primary hover:underline">
              عرض الكل
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الراكب</TableHead>
                  <TableHead>السائق</TableHead>
                  <TableHead>الموعد</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nextTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      لا توجد رحلات جارية
                    </TableCell>
                  </TableRow>
                ) : (
                  nextTrips.map((t) => (
                    <TableRow key={t["id"]}>
                      <TableCell className="font-medium">
                        {t["speakers"]?.full_name ?? "—"}
                      </TableCell>
                      <TableCell>{t["drivers"]?.full_name ?? "—"}</TableCell>
                      <TableCell>{fmt(t["scheduled_at"])}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusTone(t["status"])}>
                          {label(t["status"])}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">طلبات تحتاج متابعة ({openRequests.length})</CardTitle>
          <Link to="/requests" className="text-sm text-primary hover:underline">
            عرض الكل
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الطلب</TableHead>
                <TableHead>مقدّم الطلب</TableHead>
                <TableHead>الأولوية</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    لا توجد طلبات مفتوحة
                  </TableCell>
                </TableRow>
              ) : (
                openRequests.slice(0, 8).map((r) => (
                  <TableRow key={r["id"]}>
                    <TableCell className="font-medium">{r["title"]}</TableCell>
                    <TableCell>{r["speakers"]?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusTone(r["priority"])}>
                        {label(r["priority"])}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusTone(r["status"])}>
                        {label(r["status"])}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
