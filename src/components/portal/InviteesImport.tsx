import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, UserPlus, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NewRow = {
  full_name: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  invitee_type: string;
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

export function InviteesImport() {
  const { canRegister } = useRoles();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    fileName: string;
    total: number;
    existing: number;
    rows: NewRow[];
  } | null>(null);

  const existingQuery = useQuery({
    queryKey: ["invitees-names"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invitees").select("id, full_name");
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  const analyze = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]!]!;
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const known = new Set((existingQuery.data ?? []).map((i) => normalize(i.full_name)));
    const seen = new Set<string>();
    const rows: NewRow[] = [];
    let total = 0;
    let existing = 0;

    for (const row of json) {
      const name = pick(row, ["الاسم", "اسم", "name"]);
      if (!name) continue;
      total++;
      const key = normalize(name);
      if (known.has(key) || seen.has(key)) {
        existing++;
        continue;
      }
      seen.add(key);
      rows.push({
        full_name: name,
        organization: pick(row, ["الجهه", "المؤسسه", "الشركه", "organization", "company"]),
        email: pick(row, ["البريد", "الايميل", "email"]),
        phone: pick(row, ["الجوال", "الهاتف", "phone", "mobile"]),
        invitee_type: "guest",
      });
    }

    if (total === 0) {
      toast.error("لم يتم العثور على عمود للأسماء في الملف");
      return;
    }
    setPreview({ fileName: file.name, total, existing, rows });
  };

  const confirmImport = useMutation({
    mutationFn: async () => {
      const rows = preview?.rows ?? [];
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from("invitees").insert(rows.slice(i, i + 200) as any);
        if (error) throw new Error(error.message);
      }
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(`تمت إضافة ${count} اسمًا جديدًا`);
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["invitees-names"] });
      qc.invalidateQueries({ queryKey: ["crud", "invitees"] });
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر الحفظ"),
  });

  return (
    <div className="surface-card space-y-4 p-5" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">رفع ملف تحديث للأسماء</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            ارفع نفس ملف الأسماء بعد إضافة أسماء جديدة عليه — سيتم التعرّف على الجديد فقط وإضافته،
            مع إبقاء الأسماء الموجودة كما هي دون أي تعديل أو تكرار.
          </p>
        </div>
        <Badge variant="secondary">الموجود حاليًا: {(existingQuery.data ?? []).length}</Badge>
      </div>

      {canRegister ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void analyze(f);
              e.target.value = "";
            }}
          />
          <Button
            className="gap-1"
            disabled={existingQuery.isLoading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            اختيار ملف Excel
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">لا تملك صلاحية الرفع.</p>
      )}

      {preview && (
        <div className="space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">الملف: {preview.fileName}</Badge>
            <Badge variant="secondary">أسماء الملف: {preview.total}</Badge>
            <Badge variant="secondary">موجودة مسبقًا: {preview.existing}</Badge>
            <Badge className="gap-1">
              <UserPlus className="size-3" /> جديدة: {preview.rows.length}
            </Badge>
          </div>

          {preview.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              لا توجد أسماء جديدة في هذا الملف — كل الأسماء موجودة بالفعل.
            </p>
          ) : (
            <>
              <div className="max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-right">
                    <tr>
                      <th className="p-2 font-semibold">#</th>
                      <th className="p-2 font-semibold">الاسم</th>
                      <th className="p-2 font-semibold">الجهة</th>
                      <th className="p-2 font-semibold">الجوال</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.rows.map((r, i) => (
                      <tr key={`${r.full_name}-${i}`}>
                        <td className="p-2 text-muted-foreground">{i + 1}</td>
                        <td className="p-2 font-semibold">{r.full_name}</td>
                        <td className="p-2">{r.organization ?? "—"}</td>
                        <td className="p-2" dir="ltr">
                          {r.phone ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-1"
                  disabled={confirmImport.isPending}
                  onClick={() => confirmImport.mutate()}
                >
                  <CheckCircle2 className="size-4" />
                  {confirmImport.isPending
                    ? "جارٍ الإضافة…"
                    : `إضافة ${preview.rows.length} اسمًا جديدًا`}
                </Button>
                <Button variant="outline" onClick={() => setPreview(null)}>
                  إلغاء
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
