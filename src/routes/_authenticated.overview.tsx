import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PlaneLanding,
  PlaneTakeoff,
  Car,
  BedDouble,
  ClipboardList,
  UserCheck,
  Mic,
  Users,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
