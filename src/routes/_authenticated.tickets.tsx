import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket, Car, User, Search, PlayCircle, CheckCircle2, Clock, IdCard, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CrudPage } from "@/components/portal/CrudPage";
import { supabase } from "@/integrations/supabase/client";
import { ticketFields } from "@/lib/tableFields";
import { useRoles } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DriverCardDialog } from "@/components/portal/DriverCardDialog";


const db = supabase as any;

const DIRECTIONS = [
  { value: "all", label: "كل التذاكر" },
  { value: "arrival", label: "وصول" },
  { value: "departure", label: "مغادرة" },
  { value: "internal", label: "داخلية" },
] as const;

const TRIP_STATUS_LABELS: Record<string, string> = {
  scheduled: "مجدولة",
  in_progress: "جارية",
  completed: "مكتملة",
  cancelled: "ملغاة",
};

function directionOf(tripType: string | null) {
  if (tripType === "airport_pickup") return "arrival";
  if (tripType === "airport_dropoff") return "departure";
  return "internal";
}

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ar-SA-u-ca-gregory", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const Route = createFileRoute("/_authenticated/tickets")({
  head: () => ({
    meta: [
      { title: "تذاكر النقل — حوار الأمن والتاريخ" },
      {
        name: "description",
        content:
          "تذاكر النقل تربط السائقين والمركبات بالرحلات المجدولة والفعلية لكل متحدث مع تسجيل أوقات الانطلاق والوصول.",
      },
      { property: "og:title", content: "تذاكر النقل — حوار الأمن والتاريخ" },
      {
        property: "og:description",
        content: "ربط السائقين والمركبات بالرحلات المجدولة والفعلية ومتابعتها لحظياً.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TicketsPage,
});

function useTickets() {
  return useQuery({
    queryKey: ["transport-tickets"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [{ data: trips }, { data: drivers }, { data: vehicles }, { data: speakers }] =
        await Promise.all([
          db
            .from("transport_trips")
            .select("*")
            .order("scheduled_at", { ascending: true }),
          db.from("drivers").select("id, full_name, phone").order("full_name"),
          db.from("vehicles").select("id, plate_number, make, capacity").order("plate_number"),
          db.from("speakers").select("id, full_name, organization").order("full_name"),
        ]);

      const driverMap = new Map((drivers ?? []).map((d: any) => [d.id, d]));
      const vehicleMap = new Map((vehicles ?? []).map((v: any) => [v.id, v]));
      const speakerMap = new Map((speakers ?? []).map((s: any) => [s.id, s]));

      return {
        drivers: drivers ?? [],
        vehicles: vehicles ?? [],
        tickets: (trips ?? []).map((t: any) => ({
          ...t,
          direction: directionOf(t.trip_type),
          driver: driverMap.get(t.driver_id) ?? null,
          vehicle: vehicleMap.get(t.vehicle_id) ?? null,
          speaker: speakerMap.get(t.speaker_id) ?? null,
        })),
      };
    },
  });
}

function TicketsPage() {
  const { canEditOps, canEdit, isAdmin } = useRoles();
  const { data, isLoading } = useTickets();
  const qc = useQueryClient();
  const [direction, setDirection] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<any | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("transport_trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport-tickets"] });
      qc.invalidateQueries({ queryKey: ["fleet-trips"] });
      qc.invalidateQueries({ queryKey: ["upcoming-countdown"] });
      toast.success("تم حذف التذكرة");
      setToDelete(null);
    },
    onError: (e: any) => toast.error(e.message ?? "تعذر حذف التذكرة"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await db.from("transport_trips").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transport-tickets"] });
      qc.invalidateQueries({ queryKey: ["speakers-status-board"] });
      qc.invalidateQueries({ queryKey: ["fleet-trips"] });
      toast.success("تم تحديث التذكرة");
    },
    onError: (e: any) => toast.error(e.message ?? "تعذر التحديث"),
  });

  const tickets = data?.tickets ?? [];

  const rows = useMemo(() => {
    return tickets.filter((t: any) => {
      if (direction !== "all" && t.direction !== direction) return false;
      const q = query.trim();
      if (q) {
        const hay = `${t.ticket_no ?? ""} ${t.speaker?.full_name ?? ""} ${
          t.driver?.full_name ?? ""
        } ${t.vehicle?.plate_number ?? ""} ${t.pickup_location ?? ""} ${t.dropoff_location ?? ""}`;
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tickets, direction, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length };
    ["arrival", "departure", "internal"].forEach((d) => {
      c[d] = tickets.filter((t: any) => t.direction === d).length;
    });
    return c;
  }, [tickets]);

  const kpis = useMemo(
    () => [
      { label: "تذاكر بلا سائق", value: tickets.filter((t: any) => !t.driver_id).length },
      { label: "تذاكر بلا مركبة", value: tickets.filter((t: any) => !t.vehicle_id).length },
      { label: "جارية الآن", value: tickets.filter((t: any) => t.status === "in_progress").length },
      { label: "مكتملة", value: tickets.filter((t: any) => t.status === "completed").length },
    ],
    [tickets],
  );

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Ticket className="h-6 w-6 text-primary" />
              تذاكر النقل
            </h1>
            <p className="text-sm text-muted-foreground">
              ربط السائقين والمركبات بالرحلات المجدولة والفعلية، وتنعكس مباشرة في{" "}
              <Link to="/speakers" className="font-semibold text-primary underline-offset-4 hover:underline">
                لوحة الحالات
              </Link>{" "}
              و{" "}
              <Link to="/fleet" className="font-semibold text-primary underline-offset-4 hover:underline">
                صفحة الأسطول
              </Link>
              .
            </p>
          </div>
          <DriverCardDialog
            trigger={
              <Button variant="secondary">
                <IdCard className="ml-1 h-4 w-4" />
                بطاقة سائق (إدخال يدوي)
              </Button>
            }
          />
          <DriverCardDialog
            defaultType="trip"
            trigger={
              <Button variant="secondary">
                <IdCard className="ml-1 h-4 w-4" />
                بطاقة مشوار عادي (إدخال يدوي)
              </Button>
            }
          />
        </div>
      </header>


      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="text-2xl font-bold text-foreground">{k.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DIRECTIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDirection(d.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                  direction === d.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {d.label} ({counts[d.value] ?? 0})
              </button>
            ))}
          </div>
          <div className="relative min-w-56 flex-1 sm:max-w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث برقم التذكرة أو المتحدث أو السائق..."
              className="pr-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            لا توجد تذاكر مطابقة
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {rows.map((t: any) => (
              <article key={t.id} className="space-y-3 rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">
                      تذكرة #{t.ticket_no ?? "—"}
                    </p>
                    <p className="font-semibold text-foreground">
                      {t.speaker?.full_name ?? "بدون متحدث"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.pickup_location ?? "—"} ← {t.dropoff_location ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={t.direction === "departure" ? "outline" : "secondary"}>
                      {t.direction === "arrival" ? "وصول" : t.direction === "departure" ? "مغادرة" : "داخلي"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {TRIP_STATUS_LABELS[t.status] ?? t.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-[11px]">
                  <div>
                    <p className="text-muted-foreground">المجدول</p>
                    <p className="font-semibold text-foreground">{fmt(t.scheduled_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الانطلاق الفعلي</p>
                    <p className="font-semibold text-foreground">{fmt(t.actual_pickup_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">الوصول الفعلي</p>
                    <p className="font-semibold text-foreground">{fmt(t.actual_dropoff_at)}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" /> السائق
                    </label>
                    <Select
                      disabled={!canEditOps}
                      value={t.driver_id ?? "none"}
                      onValueChange={(v) =>
                        update.mutate({ id: t.id, patch: { driver_id: v === "none" ? null : v } })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="اختر سائقاً" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون سائق</SelectItem>
                        {(data?.drivers ?? []).map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.full_name}
                            {d.phone ? ` · ${d.phone}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Car className="h-3 w-3" /> المركبة
                    </label>
                    <Select
                      disabled={!canEditOps}
                      value={t.vehicle_id ?? "none"}
                      onValueChange={(v) =>
                        update.mutate({ id: t.id, patch: { vehicle_id: v === "none" ? null : v } })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="اختر مركبة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون مركبة</SelectItem>
                        {(data?.vehicles ?? []).map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.plate_number}
                            {v.make ? ` · ${v.make}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <DriverCardDialog trip={t} canEdit={canEditOps} />
                  <DriverCardDialog
                    trip={t}
                    canEdit={canEditOps}
                    defaultType="trip"
                    trigger={
                      <Button size="sm" variant="outline">
                        <IdCard className="ml-1 h-4 w-4" />
                        بطاقة مشوار
                      </Button>
                    }
                  />
                </div>

                {canEditOps && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={t.actual_pickup_at ? "outline" : "default"}
                      onClick={() =>
                        update.mutate({
                          id: t.id,
                          patch: t.actual_pickup_at
                            ? { actual_pickup_at: null, status: "scheduled" }
                            : { actual_pickup_at: new Date().toISOString(), status: "in_progress" },
                        })
                      }
                    >
                      <PlayCircle className="ml-1 h-4 w-4" />
                      {t.actual_pickup_at ? "إلغاء الانطلاق" : "بدء الرحلة"}
                    </Button>
                    <Button
                      size="sm"
                      variant={t.actual_dropoff_at ? "outline" : "secondary"}
                      onClick={() =>
                        update.mutate({
                          id: t.id,
                          patch: t.actual_dropoff_at
                            ? { actual_dropoff_at: null, status: "in_progress" }
                            : { actual_dropoff_at: new Date().toISOString(), status: "completed" },
                        })
                      }
                    >
                      <CheckCircle2 className="ml-1 h-4 w-4" />
                      {t.actual_dropoff_at ? "إلغاء الوصول" : "إنهاء الرحلة"}
                    </Button>
                    {!t.scheduled_at && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> بدون موعد مجدول
                      </span>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setToDelete(t)}
                  >
                    <Trash2 className="ml-1 h-4 w-4" />
                    حذف التذكرة
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {canEdit && (
        <CrudPage
          table="transport_trips"
          title="سجل التذاكر"
          subtitle="إضافة وتعديل تذاكر النقل وربطها بالمتحدثين والسائقين والمركبات"
          fields={ticketFields}
        />
      )}
    </div>
  );
}
