import { useMemo, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

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

export type OpsColumn<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
};

export type OpsKpi = { label: string; value: number | string };

type Props<T extends { id: string }> = {
  title: string;
  subtitle: string;
  kpis?: OpsKpi[];
  columns: OpsColumn<T>[];
  rows: T[];
  searchKeys: (keyof T)[];
  statusKey?: keyof T;
  statuses?: string[];
  actionLabel?: string;
};

export function OpsPage<T extends { id: string }>({
  title,
  subtitle,
  kpis = [],
  columns,
  rows,
  searchKeys,
  statusKey,
  statuses = [],
  actionLabel,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("الكل");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchQuery =
        !q ||
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q));
      const matchStatus =
        !statusKey || status === "الكل" || String(row[statusKey]) === status;
      return matchQuery && matchStatus;
    });
  }, [rows, query, status, searchKeys, statusKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {actionLabel ? <Button>{actionLabel}</Button> : null}
      </div>

      {kpis.length ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="بحث…"
                className="pe-9"
                aria-label="بحث"
              />
            </div>
            {statusKey && statuses.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <SlidersHorizontal className="size-4 text-muted-foreground" />
                {["الكل", ...statuses].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      status === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            <Badge variant="secondary" className="ms-auto">
              {filtered.length} سجل
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-start">
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-10 text-center text-sm text-muted-foreground">
                      لا توجد نتائج مطابقة
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((c) => (
                        <TableCell key={c.key} className="whitespace-nowrap">
                          {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatusPill({ label, tone = "muted" }: { label: string; tone?: string }) {
  const tones: Record<string, string> = {
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    danger: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${tones[tone] ?? tones["muted"]}`}>
      {label}
    </span>
  );
}
