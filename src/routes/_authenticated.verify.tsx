import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Upload, Trash2, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/verify")({
  component: VerifyPage,
  head: () => ({
    meta: [
      { title: "قائمة التحقق بالأسماء — بوابة المؤتمر" },
      {
        name: "description",
        content: "شاشة مستقلة للتحقق من الأسماء عبر البحث بالاسم أو المنصب أو جزء منه.",
      },
      { property: "og:title", content: "قائمة التحقق بالأسماء — بوابة المؤتمر" },
      {
        property: "og:description",
        content: "ارفع قائمة أسماء مستقلة وابحث فيها بالاسم أو المنصب.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = {
  id: string;
  full_name: string;
  position: string | null;
  organization: string | null;
  notes: string | null;
  batch_label: string | null;
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

function VerifyPage() {
  const { isAdmin, canEdit } = useRoles();
  const canManage = isAdmin || canEdit;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");

  const listQuery = useQuery({
    queryKey: ["verification-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("verification_list")
        .select("id, full_name, position, organization, notes, batch_label")
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
        }))
        .filter((r) => r.full_name);

      if (payload.length === 0) throw new Error("لم يتم العثور على عمود للأسماء في الملف");

      for (let i = 0; i < payload.length; i += 200) {
        const { error } = await (supabase as any)
          .from("verification_list")
          .insert(payload.slice(i, i + 200));
        if (error) throw new Error(error.message);
      }
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`تم رفع ${count} اسمًا`);
      qc.invalidateQueries({ queryKey: ["verification-list"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر رفع الملف"),
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("verification_list")
        .delete()
        .not("id", "is", null);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("تم مسح القائمة");
      qc.invalidateQueries({ queryKey: ["verification-list"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر المسح"),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">التحقق من الأسماء</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            قائمة مستقلة لا ترتبط ببقية أقسام النظام — للبحث والتحقق بالاسم أو المنصب فقط.
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

      <div className="surface-card space-y-4 p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث بالاسم أو جزء منه أو بالمنصب…"
            className="h-12 pe-10 text-base"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">الإجمالي: {rows.length}</Badge>
          <Badge variant="secondary">النتائج: {results.length}</Badge>
          {q && results.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-primary">
              <CheckCircle2 className="size-4" /> الاسم موجود في القائمة
            </span>
          ) : null}
          {q && results.length === 0 ? (
            <span className="text-destructive">لا توجد نتائج مطابقة</span>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-right">
              <tr>
                <th className="p-3 font-semibold">#</th>
                <th className="p-3 font-semibold">الاسم</th>
                <th className="p-3 font-semibold">المنصب</th>
                <th className="p-3 font-semibold">الجهة</th>
                <th className="p-3 font-semibold">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    جارٍ التحميل…
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && results.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    {rows.length === 0 ? "لم يتم رفع أي قائمة بعد" : "لا توجد نتائج"}
                  </td>
                </tr>
              )}
              {results.slice(0, 500).map((r, idx) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-semibold">{r.full_name}</td>
                  <td className="p-3">{r.position ?? "—"}</td>
                  <td className="p-3">{r.organization ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{r.notes ?? "—"}</td>
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
