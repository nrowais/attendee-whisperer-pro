import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Upload,
  Trash2,
  Check,
  X,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dinner")({
  component: DinnerPage,
  head: () => ({
    meta: [
      { title: "المدعوون للعشاء — بوابة المؤتمر" },
      {
        name: "description",
        content: "قائمة المدعوين لحفل العشاء مع تأكيد الدعوة وإضافة ضيوف جدد.",
      },
      { property: "og:title", content: "المدعوون للعشاء — بوابة المؤتمر" },
      {
        property: "og:description",
        content: "تأكيد دعوات العشاء والبحث عن المدعوين وإضافة أسماء جديدة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Status = "pending" | "confirmed" | "declined";

type Row = {
  id: string;
  full_name: string;
  position: string | null;
  organization: string | null;
  notes: string | null;
  status: Status;
  confirmed_at: string | null;
};

const normalize = (v: unknown) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();

const pick = (row: Record<string, unknown>, keys: string[]) => {
  for (const [k, v] of Object.entries(row)) {
    const nk = normalize(k);
    if (keys.some((key) => nk === key || nk.includes(key))) {
      const val = String(v ?? "").trim();
      if (val) return val;
    }
  }
  return null;
};

function DinnerPage() {
  const { isAdmin, canEdit, canRegister } = useRoles();
  const canManage = isAdmin || canEdit;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [newOrg, setNewOrg] = useState("");

  const listQuery = useQuery({
    queryKey: ["dinner-guests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("dinner_guests")
        .select("id, full_name, position, organization, notes, status, confirmed_at")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const rows = listQuery.data ?? [];

  const results = useMemo(() => {
    const term = normalize(q);
    if (!term) return rows;
    return rows.filter((r) =>
      [r.full_name, r.position, r.organization, r.notes].some((f) => normalize(f).includes(term)),
    );
  }, [rows, q]);

  const counts = useMemo(
    () => ({
      confirmed: rows.filter((r) => r.status === "confirmed").length,
      declined: rows.filter((r) => r.status === "declined").length,
      pending: rows.filter((r) => r.status === "pending").length,
    }),
    [rows],
  );

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await (supabase as any)
        .from("dinner_guests")
        .update({
          status,
          confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dinner-guests"] }),
    onError: (e: any) => toast.error(e?.message ?? "تعذّر تحديث الحالة"),
  });

  const addGuest = useMutation({
    mutationFn: async () => {
      const name = newName.trim();
      if (!name) throw new Error("أدخل اسم الضيف");
      const { error } = await (supabase as any).from("dinner_guests").insert({
        full_name: name,
        position: newPosition.trim() || null,
        organization: newOrg.trim() || null,
        status: "pending",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تمت إضافة الضيف");
      setNewName("");
      setNewPosition("");
      setNewOrg("");
      qc.invalidateQueries({ queryKey: ["dinner-guests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّرت الإضافة"),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!]!;
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      const payload = json
        .map((row) => ({
          full_name: pick(row, ["الاسم", "اسم", "name"]) ?? "",
          position: pick(row, ["المنصب", "الصفه", "الوظيفه", "المسمي", "position", "title"]),
          organization: pick(row, ["الجهه", "المؤسسه", "الشركه", "organization", "company"]),
          notes: pick(row, ["ملاحظات", "notes"]),
          batch_label: file.name,
          status: "pending",
        }))
        .filter((r) => r.full_name);

      if (payload.length === 0) throw new Error("لم يتم العثور على عمود للأسماء في الملف");

      const existing = new Set(rows.map((r) => normalize(r.full_name)));
      const fresh = payload.filter((r) => !existing.has(normalize(r.full_name)));
      if (fresh.length === 0) throw new Error("جميع الأسماء موجودة مسبقًا");

      for (let i = 0; i < fresh.length; i += 200) {
        const { error } = await (supabase as any)
          .from("dinner_guests")
          .insert(fresh.slice(i, i + 200));
        if (error) throw new Error(error.message);
      }
      return fresh.length;
    },
    onSuccess: (count) => {
      toast.success(`تمت إضافة ${count} اسمًا جديدًا`);
      qc.invalidateQueries({ queryKey: ["dinner-guests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر رفع الملف"),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("dinner_guests")
        .delete()
        .not("id", "is", null);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم مسح القائمة");
      qc.invalidateQueries({ queryKey: ["dinner-guests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر المسح"),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">المدعوون للعشاء</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            قائمة مدعوي حفل العشاء — تأكيد الدعوة أو عدم التأكيد، مع إمكانية إضافة ضيف جديد.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload.mutate(f);
                e.target.value = "";
              }}
            />
            <Button
              className="gap-1"
              disabled={upload.isPending}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              {upload.isPending ? "جارٍ الرفع…" : "رفع ملف Excel"}
            </Button>
            {rows.length > 0 && (
              <Button
                variant="destructive"
                className="gap-1"
                disabled={clearAll.isPending}
                onClick={() => {
                  if (confirm("سيتم حذف جميع الأسماء في هذه القائمة. متابعة؟")) clearAll.mutate();
                }}
              >
                <Trash2 className="size-4" />
                مسح القائمة
              </Button>
            )}
          </div>
        )}
      </div>

      {canRegister && (
        <div className="surface-card space-y-3 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserPlus className="size-4" /> إضافة ضيف جديد
          </h2>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="اسم الضيف *"
            />
            <Input
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              placeholder="المنصب"
            />
            <Input
              value={newOrg}
              onChange={(e) => setNewOrg(e.target.value)}
              placeholder="الجهة"
            />
            <Button
              disabled={addGuest.isPending || !newName.trim()}
              onClick={() => addGuest.mutate()}
            >
              {addGuest.isPending ? "جارٍ الإضافة…" : "إضافة"}
            </Button>
          </div>
        </div>
      )}

      <div className="surface-card space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو جزء منه أو بالمنصب…"
            className="h-12 pe-10 text-base"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">الإجمالي: {rows.length}</Badge>
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
            مؤكد: {counts.confirmed}
          </Badge>
          <Badge variant="destructive">غير مؤكد: {counts.declined}</Badge>
          <Badge variant="outline">بانتظار الرد: {counts.pending}</Badge>
          <Badge variant="secondary">النتائج: {results.length}</Badge>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-right">
              <tr>
                <th className="p-3 font-semibold">#</th>
                <th className="p-3 font-semibold">الاسم</th>
                <th className="p-3 font-semibold">المنصب</th>
                <th className="p-3 font-semibold">الجهة</th>
                <th className="p-3 font-semibold">الحالة</th>
                {canRegister && <th className="p-3 font-semibold">تأكيد الدعوة</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    جارٍ التحميل…
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && results.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    {rows.length === 0 ? "لم تتم إضافة أي مدعو بعد" : "لا توجد نتائج"}
                  </td>
                </tr>
              )}
              {results.slice(0, 500).map((r, idx) => (
                <tr
                  key={r.id}
                  className={
                    r.status === "confirmed"
                      ? "bg-emerald-500/10"
                      : r.status === "declined"
                        ? "bg-destructive/10"
                        : "hover:bg-muted/40"
                  }
                >
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-semibold">{r.full_name}</td>
                  <td className="p-3">{r.position ?? "—"}</td>
                  <td className="p-3">{r.organization ?? "—"}</td>
                  <td className="p-3">
                    {r.status === "confirmed" ? (
                      <span className="font-semibold text-emerald-600">مؤكد الحضور</span>
                    ) : r.status === "declined" ? (
                      <span className="font-semibold text-destructive">لم يؤكد</span>
                    ) : (
                      <span className="text-muted-foreground">بانتظار الرد</span>
                    )}
                  </td>
                  {canRegister && (
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={r.status === "confirmed" ? "default" : "outline"}
                          className="gap-1"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({
                              id: r.id,
                              status: r.status === "confirmed" ? "pending" : "confirmed",
                            })
                          }
                        >
                          <Check className="size-4" /> أكد الدعوة
                        </Button>
                        <Button
                          size="sm"
                          variant={r.status === "declined" ? "destructive" : "outline"}
                          className="gap-1"
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({
                              id: r.id,
                              status: r.status === "declined" ? "pending" : "declined",
                            })
                          }
                        >
                          <X className="size-4" /> لم يؤكد
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {results.length > 500 && (
          <p className="text-xs text-muted-foreground">
            يعرض أول 500 نتيجة — استخدم البحث لتضييق النطاق.
          </p>
        )}
      </div>
    </div>
  );
}
