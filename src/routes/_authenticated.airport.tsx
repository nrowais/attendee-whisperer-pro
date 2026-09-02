import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plane, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRoles } from "@/hooks/useAuth";
import {
  getAirportBoard,
  syncFlightStatus,
  syncAllFlights,
} from "@/lib/flights.functions";

export const Route = createFileRoute("/_authenticated/airport")({
  head: () => ({
    meta: [
      { title: "شاشة المطار — حوار الأمن والتاريخ" },
      { name: "description", content: "متابعة لحظية لرحلات الطيران واكتشاف التأخيرات حسب أرقام الرحلات." },
      { property: "og:title", content: "شاشة المطار — حوار الأمن والتاريخ" },
      { property: "og:description", content: "متابعة لحظية لرحلات الطيران واكتشاف التأخيرات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AirportPage,
});

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  scheduled: { label: "مجدول", variant: "secondary" },
  active: { label: "في الجو", variant: "default" },
  landed: { label: "هبطت", variant: "default" },
  arrived: { label: "وصلت", variant: "default" },
  cancelled: { label: "ملغاة", variant: "destructive" },
  diverted: { label: "تحويل مسار", variant: "destructive" },
  unknown: { label: "غير معروف", variant: "outline" },
};

function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-SA-u-ca-gregory", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("ar-SA-u-ca-gregory", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AirportPage() {
  const { canEdit } = useRoles();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const fetchBoard = useServerFn(getAirportBoard);
  const doSyncOne = useServerFn(syncFlightStatus);
  const doSyncAll = useServerFn(syncAllFlights);

  const board = useQuery({
    queryKey: ["airport-board"],
    queryFn: () => fetchBoard(),
  });

  const syncOne = useMutation({
    mutationFn: async (flightId: string) => doSyncOne({ data: { flightId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["airport-board"] });
      queryClient.invalidateQueries({ queryKey: ["flight-alerts-log"] });
      toast.success("تم تحديث حالة الرحلة");
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر تحديث الرحلة"),
  });

  const syncAll = useMutation({
    mutationFn: () => doSyncAll(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["airport-board"] });
      queryClient.invalidateQueries({ queryKey: ["flight-alerts-log"] });
      const failed = data.results.filter((r: any) => !r.ok).length;
      toast.success(`تمت مزامنة ${data.synced - failed} رحلة${failed ? `، فشل ${failed}` : ""}`);
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر تحديث الرحلات"),
  });

  const flights: any[] = board.data?.flights ?? [];
  const personsByFlight: Record<string, string[]> = board.data?.personsByFlight ?? {};

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return flights.filter((f) => {
      if (!term) return true;
      const hay = [f.flight_number, f.airline, f.origin, f.destination, (personsByFlight[f.id] ?? []).join(" ")]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return hay.includes(term);
    });
  }, [flights, personsByFlight, q]);

  const counts = useMemo(() => {
    const total = flights.length;
    const delayed = flights.filter((f) => (f.live_delay_minutes ?? 0) >= 15).length;
    const cancelled = flights.filter((f) => ["cancelled", "diverted"].includes(f.live_status)).length;
    const onTime = total - delayed - cancelled;
    return { total, delayed, cancelled, onTime };
  }, [flights]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Plane className="size-5 text-primary" />
            شاشة المطار
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            متابعة لحظية لرحلات الفعالية واكتشاف التأخيرات والإلغاءات حسب رقم الرحلة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث برقم الرحلة أو الوجهة أو اسم الضيف…"
            className="w-full sm:w-72"
            aria-label="بحث في الرحلات"
          />
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => syncAll.mutate()}
              disabled={syncAll.isPending || board.isLoading}
              className="gap-2"
            >
              {syncAll.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              تحديث الكل
            </Button>
          )}
        </div>
      </div>

      {!canEdit && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-primary">
            <AlertCircle className="size-5 shrink-0" />
            عرض فقط: يمكن للمدير أو المنسّق تحديث الحالة من AviationStack.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "إجمالي الرحلات", value: counts.total },
          { label: "في الموعد", value: counts.onTime },
          { label: "متأخرة", value: counts.delayed, tone: "text-destructive" },
          { label: "ملغاة / محوّلة", value: counts.cancelled, tone: "text-destructive" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`mt-1 font-display text-2xl font-bold ${k.tone ?? "text-foreground"}`}>{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              نطاق الفعالية: {board.data?.eventRange?.start ?? "—"} ← {board.data?.eventRange?.end ?? "—"}
            </p>
            <Button variant="link" asChild className="h-auto p-0 text-sm">
              <Link to="/settings">ضبط مفتاح AviationStack</Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">الرحلة</TableHead>
                  <TableHead className="text-start">المسار / الضيوف</TableHead>
                  <TableHead className="text-start">الموعد المجدول</TableHead>
                  <TableHead className="text-start">الواقعي</TableHead>
                  <TableHead className="text-start">التأخير</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                  <TableHead className="text-start">بوابة / صالة</TableHead>
                  <TableHead className="text-start">آخر تحديث</TableHead>
                  <TableHead className="text-start">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {board.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      جارٍ تحميل رحلات المطار…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      لا توجد رحلات مطابقة ضمن نطاق الفعالية.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((f) => {
                    const persons = personsByFlight[f.id] ?? [];
                    const isDelayed = (f.live_delay_minutes ?? 0) >= 15;
                    const st = statusLabels[f.live_status ?? "unknown"] || statusLabels["unknown"];
                    return (
                      <TableRow key={f.id} className={isDelayed ? "bg-destructive/5" : ""}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {[f.airline, f.flight_number].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="min-w-[12rem]">
                          <div className="text-sm text-muted-foreground">
                            {[f.origin, f.destination].filter(Boolean).join(" ← ") || "—"}
                          </div>
                          {persons.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {persons.map((name) => (
                                <Badge key={name} variant="outline" className="text-[11px]">
                                  {name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {f.arrival_time && (
                            <div>
                              وصول {fmtTime(f.arrival_time)} · {fmtDateTime(f.arrival_time)}
                            </div>
                          )}
                          {f.departure_time && (
                            <div>
                              إقلاع {fmtTime(f.departure_time)} · {fmtDateTime(f.departure_time)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {f.live_actual_arrival && (
                            <div>وصول {fmtTime(f.live_actual_arrival)}</div>
                          )}
                          {f.live_actual_departure && (
                            <div>إقلاع {fmtTime(f.live_actual_departure)}</div>
                          )}
                          {!f.live_actual_arrival && !f.live_actual_departure && "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {isDelayed ? (
                            <Badge variant="destructive">{f.live_delay_minutes} د</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {[f.live_gate, f.live_terminal].filter(Boolean).join(" / ") || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {f.live_last_synced_at ? fmtDateTime(f.live_last_synced_at) : "لم تُحدّث"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={syncOne.isPending}
                              onClick={() => syncOne.mutate(f.id)}
                            >
                              {syncOne.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
                              تحقق الآن
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
