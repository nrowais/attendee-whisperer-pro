import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Ban,
  Loader2,
  Pencil,
  PlaneLanding,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  FLIGHT_STATUS_LABELS,
  RECEPTION_STAGES,
  RECEPTION_STAGE_LABELS,
  type FlightStatus,
} from "@/lib/flightStatus";
import {
  getReceptionBoard,
  syncAllSpeakerFlights,
  syncOneSpeakerFlight,
  updateSpeakerFlight,
} from "@/lib/reception.functions";

export const Route = createFileRoute("/_authenticated/reception")({
  head: () => ({
    meta: [
      { title: "مركز الرحلات والاستقبال — SHDC 2026" },
      {
        name: "description",
        content: "متابعة لحظية لرحلات المتحدثين والضيوف وحالات الوصول والاستقبال في مؤتمر حوار الأمن والتاريخ.",
      },
      { property: "og:title", content: "مركز الرحلات والاستقبال — SHDC 2026" },
      { property: "og:description", content: "لوحة عمليات الوصول: حالات الرحلات، التأخيرات، ومراحل الاستقبال." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReceptionPage,
});

const statusStyle: Record<string, string> = {
  arrived: "bg-emerald-600 text-white border-transparent",
  landed: "bg-emerald-600/80 text-white border-transparent",
  enroute: "bg-blue-600 text-white border-transparent",
  departed: "bg-blue-500/80 text-white border-transparent",
  boarding: "bg-blue-400/80 text-white border-transparent",
  delayed: "bg-orange-500 text-white border-transparent",
  cancelled: "bg-red-600 text-white border-transparent",
  diverted: "bg-red-500 text-white border-transparent",
  scheduled: "bg-muted text-muted-foreground border-transparent",
  unknown: "bg-muted text-muted-foreground border-transparent",
};

function fmt(v?: string | null) {
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

function toLocalInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${tone ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ReceptionPage() {
  const { canEdit } = useRoles();
  const qc = useQueryClient();

  const fetchBoard = useServerFn(getReceptionBoard);
  const doSyncOne = useServerFn(syncOneSpeakerFlight);
  const doSyncAll = useServerFn(syncAllSpeakerFlights);
  const doUpdate = useServerFn(updateSpeakerFlight);

  const board = useQuery({
    queryKey: ["reception-board"],
    queryFn: () => fetchBoard(),
    refetchInterval: 60_000,
  });

  const [q, setQ] = useState("");
  const [fDate, setFDate] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fAirport, setFAirport] = useState("all");
  const [fAirline, setFAirline] = useState("all");
  const [fHost, setFHost] = useState("all");
  const [editing, setEditing] = useState<any | null>(null);

  const speakers: any[] = board.data?.speakers ?? [];
  const logistics: Record<string, any> = board.data?.logistics ?? {};
  const withFlights = useMemo(() => speakers.filter((s) => s.flight_number || s.scheduled_arrival), [speakers]);

  const airports = useMemo(
    () => Array.from(new Set(withFlights.map((s) => s.arrival_airport).filter(Boolean))) as string[],
    [withFlights],
  );
  const airlines = useMemo(
    () => Array.from(new Set(withFlights.map((s) => s.airline).filter(Boolean))) as string[],
    [withFlights],
  );
  const hosts = useMemo(
    () => Array.from(new Set(withFlights.map((s) => s.receptionist_name).filter(Boolean))) as string[],
    [withFlights],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return withFlights.filter((s) => {
      if (fDate && String(s.flight_date ?? "").slice(0, 10) !== fDate) return false;
      if (fStatus !== "all" && (s.flight_status ?? "unknown") !== fStatus) return false;
      if (fAirport !== "all" && s.arrival_airport !== fAirport) return false;
      if (fAirline !== "all" && s.airline !== fAirline) return false;
      if (fHost !== "all" && s.receptionist_name !== fHost) return false;
      if (!term) return true;
      return [s.full_name, s.flight_number, s.airline, s.departure_airport, s.arrival_airport]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ")
        .includes(term);
    });
  }, [withFlights, q, fDate, fStatus, fAirport, fAirline, fHost]);

  const today = new Date().toISOString().slice(0, 10);
  const counters = useMemo(() => {
    const todays = withFlights.filter((s) => String(s.flight_date ?? "").slice(0, 10) === today);
    const by = (st: string[]) => todays.filter((s) => st.includes(s.flight_status ?? "unknown")).length;
    const arrived = todays.filter((s) => ["landed", "arrived"].includes(s.flight_status ?? ""));
    return {
      total: todays.length,
      upcoming: by(["scheduled", "boarding", "unknown"]),
      enroute: by(["enroute", "departed"]),
      delayed: by(["delayed"]),
      cancelled: by(["cancelled", "diverted"]),
      arrived: arrived.length,
      received: arrived.filter((s) => s.reception_stage && s.reception_stage !== "arrived_airport").length,
      notReceived: arrived.filter((s) => !s.reception_stage || s.reception_stage === "arrived_airport").length,
    };
  }, [withFlights, today]);

  const alerts = useMemo(
    () => ({
      cancelled: withFlights.filter((s) => ["cancelled", "diverted"].includes(s.flight_status ?? "")),
      delayed: withFlights.filter((s) => s.flight_status === "delayed"),
    }),
    [withFlights],
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["reception-board"] });
    qc.invalidateQueries({ queryKey: ["speakers-status-board"] });
  };

  const syncOne = useMutation({
    mutationFn: (speakerId: string) => doSyncOne({ data: { speakerId } }),
    onSuccess: (r: any) => {
      const first = r?.results?.[0];
      if (first && !first.ok) toast.error(first.error ?? "تعذر تحديث الرحلة");
      else toast.success("تم تحديث حالة الرحلة");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر تحديث الرحلة"),
  });

  const syncAll = useMutation({
    mutationFn: () => doSyncAll({ data: { date: fDate || today } }),
    onSuccess: (r: any) => {
      toast.success(`تمت مزامنة ${r.synced} رحلة — ${r.changed} تغيّر`);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر تحديث الرحلات"),
  });

  const save = useMutation({
    mutationFn: (payload: { speakerId: string; patch: any }) => doUpdate({ data: payload }),
    onSuccess: () => {
      toast.success("تم الحفظ");
      setEditing(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذر الحفظ"),
  });

  const setStage = (s: any, stage: string) =>
    save.mutate({ speakerId: s.id, patch: { reception_stage: s.reception_stage === stage ? null : stage } });

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">مركز الرحلات والاستقبال</h1>
          <p className="text-sm text-muted-foreground">مركز عمليات الوصول — متابعة لحظية لرحلات المتحدثين ومراحل الاستقبال</p>
        </div>
        {canEdit && (
          <Button onClick={() => syncAll.mutate()} disabled={syncAll.isPending}>
            {syncAll.isPending ? <Loader2 className="ms-2 h-4 w-4 animate-spin" /> : <RefreshCw className="ms-2 h-4 w-4" />}
            تحديث حالات الرحلات
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label="رحلات اليوم" value={counters.total} />
        <Stat label="القادمة" value={counters.upcoming} />
        <Stat label="في الجو" value={counters.enroute} tone="text-blue-600" />
        <Stat label="المتأخرة" value={counters.delayed} tone="text-orange-500" />
        <Stat label="الملغاة" value={counters.cancelled} tone="text-red-600" />
        <Stat label="التي وصلت" value={counters.arrived} tone="text-emerald-600" />
        <Stat label="تم استقبالهم" value={counters.received} tone="text-emerald-600" />
        <Stat label="لم يتم استقبالهم" value={counters.notReceived} tone="text-orange-500" />
      </div>

      {alerts.cancelled.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-red-600">
            <Ban className="h-4 w-4" /> تنبيه عالي الأولوية — رحلات ملغاة أو محوّلة
          </p>
          <p className="mt-1 text-sm">
            {alerts.cancelled.map((s) => `${s.full_name} (${s.flight_number ?? "—"})`).join(" · ")}
          </p>
        </div>
      )}
      {alerts.delayed.length > 0 && (
        <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-4">
          <p className="flex items-center gap-2 font-semibold text-orange-600">
            <AlertTriangle className="h-4 w-4" /> رحلات متأخرة
          </p>
          <p className="mt-1 text-sm">
            {alerts.delayed
              .map((s) => `${s.full_name} (${s.flight_number ?? "—"}) +${s.delay_minutes ?? 0}د`)
              .join(" · ")}
          </p>
        </div>
      )}

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute top-2.5 start-2 h-4 w-4 text-muted-foreground" />
            <Input className="ps-8" placeholder="بحث بالاسم أو الرحلة" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
          <Select value={fStatus} onValueChange={setFStatus}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {Object.entries(FLIGHT_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fAirport} onValueChange={setFAirport}>
            <SelectTrigger><SelectValue placeholder="المطار" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المطارات</SelectItem>
              {airports.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fAirline} onValueChange={setFAirline}>
            <SelectTrigger><SelectValue placeholder="شركة الطيران" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الشركات</SelectItem>
              {airlines.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fHost} onValueChange={setFHost}>
            <SelectTrigger><SelectValue placeholder="موظف الاستقبال" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الموظفين</SelectItem>
              {hosts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* جدول مباشر — يتحول لبطاقات على الجوال */}
      <Card className="hidden lg:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">المتحدث</TableHead>
                <TableHead className="text-right">الرحلة</TableHead>
                <TableHead className="text-right">من / إلى</TableHead>
                <TableHead className="text-right">الوصول المجدول</TableHead>
                <TableHead className="text-right">المتوقع</TableHead>
                <TableHead className="text-right">التأخير</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الاستقبال / السائق</TableHead>
                <TableHead className="text-right">مرحلة الاستقبال</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => {
                const lg = logistics[s.id] ?? {};
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.full_name} className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs">
                            {String(s.full_name ?? "?").slice(0, 1)}
                          </span>
                        )}
                        <div>
                          <p className="font-medium">{s.full_name}</p>
                          <p className="text-xs text-muted-foreground">{s.organization ?? "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-mono">{s.flight_number ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{s.airline ?? "—"}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(s.departure_airport ?? "—") + " ← " + (s.arrival_airport ?? "—")}
                      <p className="text-xs text-muted-foreground">
                        صالة {s.terminal ?? "—"} · بوابة {s.gate ?? "—"} · سير {s.baggage_belt ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">{fmt(s.scheduled_arrival)}</TableCell>
                    <TableCell className="text-sm">{fmt(s.estimated_arrival ?? s.actual_arrival)}</TableCell>
                    <TableCell>
                      {s.delay_minutes > 0 ? (
                        <span className="font-semibold text-orange-600">+{s.delay_minutes}د</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyle[s.flight_status ?? "unknown"]}>
                        {FLIGHT_STATUS_LABELS[(s.flight_status ?? "unknown") as FlightStatus] ?? "غير معروفة"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p>{s.receptionist_name ?? "—"} {s.receptionist_phone ? `· ${s.receptionist_phone}` : ""}</p>
                      <p className="text-muted-foreground">
                        {s.driver_name ?? lg.driver ?? "—"} · {s.vehicle_label ?? lg.vehicle ?? "—"} {lg.phone ? `· ${lg.phone}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StageControl speaker={s} canEdit={canEdit} onSet={setStage} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(s)} title="تعديل">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="تحديث من خدمة الرحلات"
                            disabled={syncOne.isPending}
                            onClick={() => syncOne.mutate(s.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    لا توجد رحلات مطابقة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* عرض الجوال */}
      <div className="grid gap-3 lg:hidden">
        {rows.map((s) => {
          const lg = logistics[s.id] ?? {};
          return (
            <Card key={s.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.full_name} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        {String(s.full_name ?? "?").slice(0, 1)}
                      </span>
                    )}
                    <div>
                      <p className="font-semibold">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.flight_number ?? "—"} · {s.airline ?? "—"}
                      </p>
                    </div>
                  </div>
                  <Badge className={statusStyle[s.flight_status ?? "unknown"]}>
                    {FLIGHT_STATUS_LABELS[(s.flight_status ?? "unknown") as FlightStatus]}
                  </Badge>
                </div>
                <p className="text-sm">
                  {(s.departure_airport ?? "—") + " ← " + (s.arrival_airport ?? "—")} · الوصول {fmt(s.estimated_arrival ?? s.scheduled_arrival)}
                  {s.delay_minutes > 0 ? <span className="text-orange-600"> (+{s.delay_minutes}د)</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  استقبال: {s.receptionist_name ?? "—"} · سائق: {s.driver_name ?? lg.driver ?? "—"}
                </p>
                <StageControl speaker={s} canEdit={canEdit} onSet={setStage} />
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                      <Pencil className="ms-1 h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => syncOne.mutate(s.id)}>
                      <RefreshCw className="ms-1 h-3.5 w-3.5" /> تحديث
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <PlaneLanding className="h-4 w-4" /> سجل تغيّرات الرحلات
          </p>
          <div className="max-h-72 space-y-2 overflow-auto text-sm">
            {(board.data?.history ?? []).map((h: any) => (
              <div key={h.id} className="flex flex-wrap items-center gap-2 rounded border p-2">
                <span className="font-mono">{h.flight_number ?? "—"}</span>
                <span className="text-muted-foreground">
                  {FLIGHT_STATUS_LABELS[(h.old_status ?? "unknown") as FlightStatus] ?? h.old_status} ←{" "}
                </span>
                <span className="font-medium">
                  {FLIGHT_STATUS_LABELS[(h.new_status ?? "unknown") as FlightStatus] ?? h.new_status}
                </span>
                {h.delay_minutes ? <span className="text-orange-600">+{h.delay_minutes}د</span> : null}
                <span className="text-xs text-muted-foreground">{fmt(h.created_at)} · {h.source}</span>
              </div>
            ))}
            {(board.data?.history ?? []).length === 0 && (
              <p className="text-muted-foreground">لا توجد تغيّرات مسجلة بعد.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <EditDialog
        speaker={editing}
        onClose={() => setEditing(null)}
        onSave={(patch) => editing && save.mutate({ speakerId: editing.id, patch })}
        saving={save.isPending}
      />
    </div>
  );
}

function StageControl({
  speaker,
  canEdit,
  onSet,
}: {
  speaker: any;
  canEdit: boolean;
  onSet: (s: any, stage: string) => void;
}) {
  const current = speaker.reception_stage as string | null;
  return (
    <div className="flex flex-wrap gap-1">
      {RECEPTION_STAGES.map((stage) => {
        const active = current === stage;
        return (
          <Button
            key={stage}
            size="sm"
            variant={active ? "default" : "outline"}
            className="h-7 px-2 text-[11px]"
            disabled={!canEdit}
            onClick={() => onSet(speaker, stage)}
          >
            {RECEPTION_STAGE_LABELS[stage]}
          </Button>
        );
      })}
    </div>
  );
}

function EditDialog({
  speaker,
  onClose,
  onSave,
  saving,
}: {
  speaker: any | null;
  onClose: () => void;
  onSave: (patch: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<any>({});
  const key = speaker?.id ?? "none";

  useMemo(() => {
    if (speaker)
      setForm({
        flight_number: speaker.flight_number ?? "",
        flight_date: speaker.flight_date ?? "",
        airline: speaker.airline ?? "",
        departure_airport: speaker.departure_airport ?? "",
        arrival_airport: speaker.arrival_airport ?? "",
        scheduled_arrival: toLocalInput(speaker.scheduled_arrival),
        estimated_arrival: toLocalInput(speaker.estimated_arrival),
        terminal: speaker.terminal ?? "",
        gate: speaker.gate ?? "",
        baggage_belt: speaker.baggage_belt ?? "",
        flight_status: speaker.flight_status ?? "unknown",
        receptionist_name: speaker.receptionist_name ?? "",
        receptionist_phone: speaker.receptionist_phone ?? "",
        driver_name: speaker.driver_name ?? "",
        vehicle_label: speaker.vehicle_label ?? "",
      });
    return key;
  }, [key]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const fields: [string, string, string?][] = [
    ["flight_number", "رقم الرحلة"],
    ["flight_date", "تاريخ الرحلة", "date"],
    ["airline", "شركة الطيران"],
    ["departure_airport", "مطار المغادرة"],
    ["arrival_airport", "مطار الوصول"],
    ["scheduled_arrival", "الوصول المجدول", "datetime-local"],
    ["estimated_arrival", "الوصول المتوقع", "datetime-local"],
    ["terminal", "الصالة"],
    ["gate", "البوابة"],
    ["baggage_belt", "سير الأمتعة"],
    ["receptionist_name", "موظف الاستقبال"],
    ["receptionist_phone", "جوال موظف الاستقبال"],
    ["driver_name", "السائق"],
    ["vehicle_label", "السيارة"],
  ];

  return (
    <Dialog open={!!speaker} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-h-[85vh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الرحلة والاستقبال</DialogTitle>
          <DialogDescription>{speaker?.full_name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([k, label, type]) => (
            <div key={k} className="space-y-1">
              <Label>{label}</Label>
              <Input type={type ?? "text"} value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div className="space-y-1">
            <Label>حالة الرحلة</Label>
            <Select value={form.flight_status ?? "unknown"} onValueChange={(v) => set("flight_status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(FLIGHT_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button
            onClick={() =>
              onSave({
                ...form,
                scheduled_arrival: form.scheduled_arrival ? new Date(form.scheduled_arrival).toISOString() : null,
                estimated_arrival: form.estimated_arrival ? new Date(form.estimated_arrival).toISOString() : null,
              })
            }
            disabled={saving}
          >
            {saving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
