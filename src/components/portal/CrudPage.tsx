import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "datetime"
  | "select"
  | "ref"
  | "switch";

export type Field = {
  key: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  ref?: { table: string; labelKey: string };
  required?: boolean;
  list?: boolean;
  badge?: boolean;
};

type Row = Record<string, any>;

const db = supabase as any;

function formatValue(value: any, field: Field, refMaps: Record<string, Record<string, string>>) {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "switch") return value ? "نعم" : "لا";
  if (field.type === "ref") return refMaps[field.key]?.[value] ?? "—";
  if (field.type === "select") {
    return field.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  if (field.type === "date") {
    return new Date(value).toLocaleDateString("ar-SA-u-ca-gregory", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  if (field.type === "datetime") {
    return new Date(value).toLocaleString("ar-SA-u-ca-gregory", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return String(value);
}

function toInputValue(value: any, type?: FieldType) {
  if (value === null || value === undefined) return "";
  if (type === "datetime") {
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return String(value);
}

export function CrudPage({
  table,
  title,
  subtitle,
  fields,
  compact,
  overlapCheck,
  overlapNameKey = "full_name",
}: {
  table: string;
  title: string;
  subtitle?: string;
  fields: Field[];
  compact?: boolean;
  /** كشف السجلات المتداخلة مع قائمة أخرى (مثل المتحدثين) لتمييزها وفصلها دون حذف */
  overlapCheck?: (name: string | null | undefined) => boolean;
  overlapNameKey?: string;
}) {
  const queryClient = useQueryClient();
  const { canEdit: canEditAll, canRegister, canDelete: canDeleteRole } = useRoles();
  const registrationTables = ["invitees", "invitations", "attendance"];
  const canEdit = canEditAll || (canRegister && registrationTables.includes(table));
  const canDelete = canDeleteRole;
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listFields = fields.filter((f) => f.list !== false).slice(0, 6);
  const refFields = fields.filter((f) => f.type === "ref");
  const statusField = fields.find((f) => f.type === "select" && f.badge);
  const [statusFilter, setStatusFilter] = useState("all");

  const rowsQuery = useQuery({
    queryKey: ["crud", table],
    queryFn: async () => {
      const { data, error } = await db
        .from(table)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const refQueries = useQuery({
    queryKey: ["crud-refs", table],
    enabled: refFields.length > 0,
    queryFn: async () => {
      const result: Record<string, { id: string; label: string }[]> = {};
      for (const field of refFields) {
        const { data, error } = await db
          .from(field.ref!.table)
          .select(`id, ${field.ref!.labelKey}`)
          .order(field.ref!.labelKey, { ascending: true });
        if (error) throw error;
        result[field.key] = (data ?? []).map((r: Row) => ({
          id: r['id'],
          label: r[field.ref!.labelKey] ?? "—",
        }));
      }
      return result;
    },
  });

  const refMaps = useMemo(() => {
    const maps: Record<string, Record<string, string>> = {};
    for (const [key, items] of Object.entries(refQueries.data ?? {})) {
      maps[key] = Object.fromEntries(items.map((i) => [i.id, i.label]));
    }
    return maps;
  }, [refQueries.data]);

  const rows = rowsQuery.data ?? [];
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      listFields.some((f) => {
        const raw = f.type === "ref" ? refMaps[f.key]?.[row[f.key]] : row[f.key];
        return String(raw ?? "").toLowerCase().includes(term);
      }),
    );
  }, [rows, search, listFields, refMaps]);

  const visible = useMemo(() => {
    if (!statusField || statusFilter === "all") return filtered;
    return filtered.filter((row) => row[statusField.key] === statusFilter);
  }, [filtered, statusField, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: async (values: Row) => {
      const payload: Row = {};
      for (const field of fields) {
        let value = values[field.key];
        if (value === "" || value === undefined) value = null;
        if (field.type === "number" && value !== null) value = Number(value);
        if (field.type === "switch") value = !!values[field.key];
        payload[field.key] = value;
      }
      if (editing) {
        const { error } = await db.from(table).update(payload).eq("id", editing["id"]);
        if (error) throw error;
      } else {
        const { error } = await db.from(table).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crud", table] });
      toast.success(editing ? "تم حفظ التعديلات" : "تمت الإضافة بنجاح");
      setOpen(false);
      setEditing(null);
      setForm({});
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر الحفظ"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crud", table] });
      toast.success("تم الحذف");
      setDeleteId(null);
    },
    onError: (error: any) => toast.error(error?.message ?? "تعذر الحذف"),
  });

  function startCreate() {
    setEditing(null);
    const initial: Row = {};
    for (const f of fields) if (f.type === "switch") initial[f.key] = true;
    setForm(initial);
    setOpen(true);
  }

  function startEdit(row: Row) {
    setEditing(row);
    const initial: Row = {};
    for (const f of fields) initial[f.key] = f.type === "switch" ? !!row[f.key] : row[f.key];
    setForm(initial);
    setOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {compact ? (
            <div>
              <p className="text-sm font-semibold text-foreground">{subtitle ?? title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{visible.length} سجل</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">

            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="w-56 pe-9"
            />
          </div>
          {statusField ? (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل {statusField.label}</SelectItem>
                {(statusField.options ?? []).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {canEdit ? (
            <Button onClick={startCreate}>
              <Plus className="size-4" />
              إضافة
            </Button>
          ) : null}
        </div>
      </div>

      <div className="surface-card overflow-x-auto">
        {rowsQuery.isLoading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-16 text-center">
            <Inbox className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">لا توجد بيانات بعد</p>
            {canEdit ? (
              <Button variant="outline" onClick={startCreate}>
                إضافة أول سجل
              </Button>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                {listFields.map((f) => (
                  <TableHead key={f.key} className="text-start">
                    {f.label}
                  </TableHead>
                ))}
                {canEdit ? <TableHead className="w-24 text-start">إجراءات</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => (
                <TableRow
                  key={row["id"]}
                  className={canEdit ? "cursor-pointer" : undefined}
                  onClick={canEdit ? () => startEdit(row) : undefined}
                >
                  {listFields.map((f) => (
                    <TableCell key={f.key} className="text-start align-middle">
                      {f.badge ? (
                        <Badge variant="secondary">{formatValue(row[f.key], f, refMaps)}</Badge>
                      ) : (
                        <span className="line-clamp-1">{formatValue(row[f.key], f, refMaps)}</span>
                      )}
                    </TableCell>
                  ))}
                  {canEdit ? (
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => startEdit(row)}>
                          <Pencil className="size-4" />
                        </Button>
                        {canDelete ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteId(row["id"])}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-start font-display">
              {editing ? `تعديل — ${title}` : `إضافة إلى ${title}`}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.key}
                className={field.type === "textarea" ? "sm:col-span-2 space-y-2" : "space-y-2"}
              >
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required ? <span className="text-destructive"> *</span> : null}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.key}
                    value={toInputValue(form[field.key])}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  />
                ) : field.type === "switch" ? (
                  <div className="flex h-9 items-center">
                    <Switch
                      id={field.key}
                      checked={!!form[field.key]}
                      onCheckedChange={(v) => setForm({ ...form, [field.key]: v })}
                    />
                  </div>
                ) : field.type === "select" || field.type === "ref" ? (
                  <Select
                    value={form[field.key] ? String(form[field.key]) : ""}
                    onValueChange={(v) => setForm({ ...form, [field.key]: v })}
                  >
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.type === "select"
                        ? (field.options ?? []).map((o) => ({ id: o.value, label: o.label }))
                        : (refQueries.data?.[field.key] ?? [])
                      ).map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.key}
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : field.type === "datetime"
                            ? "datetime-local"
                            : "text"
                    }
                    value={toInputValue(form[field.key], field.type)}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button
              onClick={() => {
                const missing = fields.find(
                  (f) => f.required && !String(form[f.key] ?? "").trim(),
                );
                if (missing) {
                  toast.error(`الحقل المطلوب: ${missing.label}`);
                  return;
                }
                saveMutation.mutate(form);
              }}
              disabled={saveMutation.isPending}
            >
              حفظ
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-start">
              سيتم حذف هذا السجل نهائيًا ولا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              حذف
            </AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
