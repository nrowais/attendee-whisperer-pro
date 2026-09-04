import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Car, User, Search, ArrowLeftRight } from "lucide-react";

import { CrudPage } from "@/components/portal/CrudPage";
import { supabase } from "@/integrations/supabase/client";
import { driverFields, vehicleFields } from "@/lib/tableFields";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const db = supabase as any;

const DIRECTIONS = [
  { value: "all", label: "الكل" },
  { value: "arrival", label: "الوصول (استقبال من المطار)" },
  { value: "departure", label: "المغادرة (توصيل للمطار)" },
  { value: "internal", label: "تنقلات داخلية" },
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

function useFleetTrips() {
  return useQuery({
    queryKey: ["fleet-trips"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [{ data: trips }, { data: drivers }, { data: vehicles }, { data: speakers }] =
        await Promise.all([
          db
            .from("transport_trips")
            .select(
              "id, speaker_id, driver_id, vehicle_id, trip_type, status, scheduled_at, pickup_location, dropoff_location",
            )
            .order("scheduled_at", { ascending: true }),
          db.from("drivers").select("id, full_name, phone, national_id, is_available"),
          db.from("vehicles").select("id, plate_number, make, model, capacity"),
          db.from("speakers").select("id, full_name, organization"),
        ]);

      const driverMap = new Map((drivers ?? []).map((d: any) => [d.id, d]));
      const vehicleMap = new Map((vehicles ?? []).map((v: any) => [v.id, v]));
      const speakerMap = new Map((speakers ?? []).map((s: any) => [s.id, s]));

      return (trips ?? []).map((t: any) => ({
        ...t,
        direction: directionOf(t.trip_type),
        driver: driverMap.get(t.driver_id) ?? null,
        vehicle: vehicleMap.get(t.vehicle_id) ?? null,
        speaker: speakerMap.get(t.speaker_id) ?? null,
      }));
    },
  });
}

export function FleetWorkspace() {
  const { data, isLoading } = useFleetTrips();
  const [direction, setDirection] = useState<string>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return (data ?? []).filter((t: any) => {
      if (direction !== "all" && t.direction !== direction) return false;
      if (query.trim()) {
        const hay = `${t.speaker?.full_name ?? ""} ${t.driver?.full_name ?? ""} ${
          t.vehicle?.plate_number ?? ""
        } ${t.pickup_location ?? ""} ${t.dropoff_location ?? ""}`;
        if (!hay.includes(query.trim())) return false;
      }
      return true;
    });
  }, [data, direction, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: (data ?? []).length };
    ["arrival", "departure", "internal"].forEach((d) => {
      map[d] = (data ?? []).filter((t: any) => t.direction === d).length;
    });
    return map;
  }, [data]);

  return (
    <div className="space-y-6" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">السائقون والمركبات</h1>
        <p className="text-sm text-muted-foreground">
          إدارة أسطول النقل وتوزيعه على رحلات الوصول والمغادرة، مع انعكاس مباشر في{" "}
          <Link to="/speakers" className="font-semibold text-primary underline-offset-4 hover:underline">
            لوحة الحالات
          </Link>
          .
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            توزيع الرحلات حسب الوصول والمغادرة
          </h2>
          <div className="relative min-w-56 flex-1 sm:max-w-72">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث بالمتحدث أو السائق أو اللوحة..."
              className="pr-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DIRECTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDirection(d.value)}
              className={cn(
                "rounded-xl border p-3 text-center transition-colors",
                direction === d.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="block text-xs font-semibold">{d.label}</span>
              <span className="block text-lg font-bold">{counts[d.value] ?? 0}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            لا توجد رحلات مطابقة
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((t: any) => (
              <div key={t.id} className="space-y-2 rounded-xl border border-border bg-background p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-foreground">
                    {t.speaker?.full_name ?? "بدون متحدث"}
                  </span>
                  <Badge variant={t.direction === "departure" ? "outline" : "secondary"}>
                    {t.direction === "arrival"
                      ? "وصول"
                      : t.direction === "departure"
                        ? "مغادرة"
                        : "داخلي"}
                  </Badge>
                </div>
                <p className="truncate text-muted-foreground">
                  {t.pickup_location ?? "—"} ← {t.dropoff_location ?? "—"}
                </p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {t.driver?.full_name ?? "لم يُسند سائق"}
                    {t.driver?.phone ? ` · ${t.driver.phone}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Car className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {t.vehicle
                      ? `${t.vehicle.plate_number}${t.vehicle.make ? ` · ${t.vehicle.make}` : ""}`
                      : "لم تُسند مركبة"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t.scheduled_at ? new Date(t.scheduled_at).toLocaleString("ar-SA") : "بدون موعد"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {TRIP_STATUS_LABELS[t.status] ?? t.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <CrudPage
          compact
          table="drivers"
          title="السائقون"
          subtitle="سجل السائقين وحالة التوفر"
          fields={driverFields}
        />
        <CrudPage
          compact
          table="vehicles"
          title="المركبات"
          subtitle="أسطول المركبات"
          fields={vehicleFields}
        />
      </div>
    </div>
  );
}
