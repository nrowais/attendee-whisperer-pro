import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/flight-alerts")({
  head: () => ({
    meta: [
      { title: "سجل تنبيهات الرحلات — حوار الأمن والتاريخ" },
      { name: "description", content: "سجل كامل لتنبيهات رحلات الطيران المُرسلة مع وقت الإرسال وحالة كل تنبيه لكل رحلة." },
      { property: "og:title", content: "سجل تنبيهات الرحلات — حوار الأمن والتاريخ" },
      { property: "og:description", content: "تتبّع تنبيهات الوصول والإقلاع لكل رحلة وحالتها." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlightAlertsLogPage,
});

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "قيد الانتظار", variant: "destructive" },
  acknowledged: { label: "تم الاطلاع", variant: "default" },
  dismissed: { label: "مُستبعد", variant: "secondary" },
};

const typeLabels: Record<string, string> = {
  arrival: "وصول",
  departure: "إقلاع",
};

function fmt(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("ar-SA-u-ca-gregory", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FlightAlertsLogPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("الكل");

  const alerts = useQuery({
    queryKey: ["flight-alerts-log"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flight_alerts")
        .select("*, flights(airline, flight_number, origin, destination, departure_time, arrival_time)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = alerts.data ?? [];

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r: any) => {
      const f = r.flights ?? {};
      const hay = [r.message, r.alert_type, f.airline, f.flight_number, f.origin, f.destination]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      const matchQ = !term || hay.includes(term);
      const matchS = status === "الكل" || r.status === status;
      return matchQ && matchS;
    });
  }, [rows, q, status]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      pending: rows.filter((r: any) => r.status === "pending").length,
      acknowledged: rows.filter((r: any) => r.status === "acknowledged").length,
      dismissed: rows.filter((r: any) => r.status === "dismissed").length,
    }),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <BellRing className="size-5 text-primary" />
            سجل تنبيهات الرحلات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            كل التنبيهات المُرسلة لرحلات الطيران مع وقت الإرسال وحالتها.
          </p>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث برقم الرحلة أو الوجهة…"
          className="w-full sm:w-72"
          aria-label="بحث في سجل التنبيهات"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "إجمالي التنبيهات", value: counts.total },
          { label: "قيد الانتظار", value: counts.pending },
          { label: "تم الاطلاع", value: counts.acknowledged },
          { label: "مُستبعدة", value: counts.dismissed },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {["الكل", "pending", "acknowledged", "dismissed"].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {s === "الكل" ? "الكل" : statusLabels[s]?.label}
              </button>
            ))}
            <Badge variant="secondary" className="ms-auto">
              {filtered.length} تنبيه
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">الرحلة</TableHead>
                  <TableHead className="text-start">المسار</TableHead>
                  <TableHead className="text-start">نوع التنبيه</TableHead>
                  <TableHead className="text-start">الموعد المستهدف</TableHead>
                  <TableHead className="text-start">وقت الإرسال</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                  <TableHead className="text-start">نص التنبيه</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      جارٍ التحميل…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      لا توجد تنبيهات مطابقة.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r: any) => {
                    const f = r.flights ?? {};
                    const st = statusLabels[r.status] ?? { label: r.status, variant: "secondary" as const };
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap font-medium">
                          {[f.airline, f.flight_number].filter(Boolean).join(" ") || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {[f.origin, f.destination].filter(Boolean).join(" ← ") || "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline">{typeLabels[r.alert_type] ?? r.alert_type}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(r.due_at)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{fmt(r.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[26rem] text-xs leading-5 text-muted-foreground">
                          {r.message}
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
