import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IMPORT_TABLES, guessColumn } from "@/lib/sheetsImport";
import { importSheetRows } from "@/lib/sheetsImport.functions";
import { useRoles } from "@/hooks/useAuth";

const IGNORE = "__ignore__";

export const Route = createFileRoute("/_authenticated/sheets")({
  head: () => ({
    meta: [
      { title: "استيراد البيانات من Google Sheets وExcel — حوار الأمن والتاريخ" },
      {
        name: "description",
        content:
          "ارفع ملف Google Sheets أو Excel أو CSV لاستيراد بيانات المتحدثين والضيوف والنقل إلى بوابة المؤتمر.",
      },
      { property: "og:title", content: "استيراد البيانات إلى البوابة" },
      {
        property: "og:description",
        content: "رفع ملفات الجداول ومطابقة الأعمدة وإدخال السجلات دفعة واحدة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SheetsImportPage,
});

type ParsedSheet = { name: string; headers: string[]; rows: Record<string, unknown>[] };

function SheetsImportPage() {
  const runImport = useServerFn(importSheetRows);
  const { isAdmin, loading: rolesLoading } = useRoles();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetName, setSheetName] = useState<string>("");
  const [tableKey, setTableKey] = useState<string>(IMPORT_TABLES[0]!.table);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const tableDef = useMemo(
    () => IMPORT_TABLES.find((t) => t.table === tableKey)!,
    [tableKey],
  );
  const sheet = useMemo(() => sheets.find((s) => s.name === sheetName), [sheets, sheetName]);

  const autoMap = (headers: string[], table = tableKey) => {
    const def = IMPORT_TABLES.find((t) => t.table === table)!;
    const next: Record<string, string> = {};
    for (const h of headers) next[h] = guessColumn(h, def.columns) ?? IGNORE;
    setMapping(next);
  };

  const handleFile = async (file: File) => {
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellDates: true });
      const parsed: ParsedSheet[] = workbook.SheetNames.map((name) => {
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name]!, {
          defval: "",
          raw: false,
        });
        const headers = rows.length ? Object.keys(rows[0]!) : [];
        return { name, headers, rows };
      }).filter((s) => s.rows.length > 0);

      if (parsed.length === 0) {
        toast.error("الملف لا يحتوي على بيانات");
        return;
      }
      setFileName(file.name);
      setSheets(parsed);
      setSheetName(parsed[0]!.name);
      autoMap(parsed[0]!.headers);
      toast.success(`تم قراءة الملف: ${parsed[0]!.rows.length} صفًا`);
    } catch {
      toast.error("تعذّر قراءة الملف — تأكد أن الصيغة xlsx أو xls أو csv");
    }
  };

  const previewRows = useMemo(() => {
    if (!sheet) return [];
    return sheet.rows.slice(0, 5).map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [header, col] of Object.entries(mapping)) {
        if (col && col !== IGNORE) mapped[col] = row[header];
      }
      return mapped;
    });
  }, [sheet, mapping]);

  const mappedColumns = useMemo(
    () => tableDef.columns.filter((c) => Object.values(mapping).includes(c.key)),
    [tableDef, mapping],
  );

  if (!rolesLoading && !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>خاص بالمدير</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            استيراد البيانات من Google Sheets متاح لحساب المدير فقط.
          </CardContent>
        </Card>
      </div>
    );
  }

  const submit = async () => {
    if (!sheet) return;
    if (mappedColumns.length === 0) {
      toast.error("اربط عمودًا واحدًا على الأقل قبل الاستيراد");
      return;
    }
    const rows = sheet.rows
      .map((row) => {
        const mapped: Record<string, unknown> = {};
        for (const [header, col] of Object.entries(mapping)) {
          if (!col || col === IGNORE) continue;
          const def = tableDef.columns.find((c) => c.key === col);
          let value: unknown = row[header];
          if (value instanceof Date) value = value.toISOString();
          if (typeof value === "string") value = value.trim();
          if (value === "" || value === null || value === undefined) continue;
          if (def?.type === "number") {
            const num = Number(String(value).replace(/[^\d.-]/g, ""));
            if (Number.isNaN(num)) continue;
            value = num;
          }
          if ((def?.type === "datetime" || def?.type === "date") && typeof value === "string") {
            const parsedDate = new Date(value);
            if (!Number.isNaN(parsedDate.getTime())) value = parsedDate.toISOString();
            else continue;
          }
          mapped[col] = value;
        }
        return mapped;
      })
      .filter((r) => Object.keys(r).length > 0);

    setBusy(true);
    try {
      const res = await runImport({ data: { table: tableKey, rows } });
      setResult(res.inserted);
      toast.success(`تم استيراد ${res.inserted} سجلًا إلى ${tableDef.label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الاستيراد");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          استيراد البيانات من Google Sheets / Excel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          المزامنة الآن باتجاه واحد: من الملف إلى البوابة. ارفع ملفك بصيغة{" "}
          <strong>xlsx</strong> أو <strong>xls</strong> أو <strong>csv</strong>، طابق الأعمدة، ثم
          احفظ السجلات في قاعدة البيانات.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">١. اختر الجدول وارفع الملف</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>الجدول الهدف</Label>
              <Select
                value={tableKey}
                onValueChange={(v) => {
                  setTableKey(v);
                  setResult(null);
                  if (sheet) autoMap(sheet.headers, v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORT_TABLES.map((t) => (
                    <SelectItem key={t.table} value={t.table}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ملف البيانات</Label>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                <span className="ms-2">{fileName ?? "اختيار ملف (xlsx / xls / csv)"}</span>
              </Button>
            </div>
          </div>

          {sheets.length > 1 && (
            <div className="space-y-2">
              <Label>الورقة داخل الملف</Label>
              <Select
                value={sheetName}
                onValueChange={(v) => {
                  setSheetName(v);
                  const s = sheets.find((x) => x.name === v);
                  if (s) autoMap(s.headers);
                }}
              >
                <SelectTrigger className="md:w-1/2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name} ({s.rows.length} صف)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            نصيحة: من Google Sheets اختر ملف ← تنزيل ← Microsoft Excel (.xlsx) أو CSV، ثم ارفع الملف
            هنا. الاستيراد لا يعدّل ملفك في Google Sheets إطلاقًا.
          </p>
        </CardContent>
      </Card>

      {sheet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              ٢. مطابقة الأعمدة — {sheet.rows.length} صفًا في «{sheet.name}»
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {sheet.headers.map((header) => (
              <div
                key={header}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{header}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    مثال: {String(sheet.rows[0]?.[header] ?? "—")}
                  </p>
                </div>
                <Select
                  value={mapping[header] ?? IGNORE}
                  onValueChange={(v) => setMapping((m) => ({ ...m, [header]: v }))}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={IGNORE}>تجاهل هذا العمود</SelectItem>
                    {tableDef.columns.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {sheet && mappedColumns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">٣. معاينة أول ٥ سجلات قبل الحفظ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-right text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {mappedColumns.map((c) => (
                      <th key={c.key} className="whitespace-nowrap p-2 font-medium">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {mappedColumns.map((c) => (
                        <td key={c.key} className="whitespace-nowrap p-2 text-muted-foreground">
                          {String(row[c.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={submit} disabled={busy}>
                {busy ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                <span className="ms-2">استيراد {sheet.rows.length} صفًا إلى {tableDef.label}</span>
              </Button>
              {result !== null && (
                <span className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4" /> تم حفظ {result} سجلًا بنجاح
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">نفذ بواسطة نايف الرويس</p>
    </div>
  );
}
