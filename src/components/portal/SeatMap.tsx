import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Armchair, CheckCircle2, FileDown, Grid3x3, Search, Trash2, UserPlus, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const db = supabase as any;

const DEFAULT_AREA = "القاعة الرئيسية";

function normalize(v: string) {
  return v
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

type SeatData = {
  invitationId: string;
  inviteeId: string;
  name: string;
  organization: string | null;
  inviteeType: string | null;
  phone: string | null;
  status: string | null;
  present: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  vip: "كبار الشخصيات",
  guest: "ضيف",
  media: "إعلام",
  staff: "فريق عمل",
};

type Cell =
  | { kind: "seat"; n: number }
  | { kind: "table" }
  | { kind: "blank" };

type HallRow = { label: string; cells: Cell[]; count: number };

const seat = (n: number): Cell => ({ kind: "seat", n });
const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  if (step > 0) for (let i = from; i <= to; i += step) out.push(i);
  else for (let i = from; i >= to; i += step) out.push(i);
  return out;
};

/** توزيع القاعة كما في المخطط المعتمد (لا يُعدَّل) */
function buildHall(): HallRow[] {
  const rows: HallRow[] = [];

  // A1 — 21 مقعدًا مع 4 طاولات في الوسط
  rows.push({
    label: "A1",
    count: 21,
    cells: [
      ...range(20, 4, -2).map(seat),
      { kind: "table" },
      seat(2),
      { kind: "table" },
      seat(0),
      { kind: "table" },
      seat(1),
      { kind: "table" },
      seat(3),
      ...range(5, 19, 2).map(seat),
    ],
  });

  // A2 — 18 مقعدًا مع 4 مربعات صفراء فارغة في الوسط
  rows.push({
    label: "A2",
    count: 18,
    cells: [
      ...range(38, 22, -2).map(seat),
      { kind: "blank" },
      { kind: "blank" },
      { kind: "blank" },
      { kind: "blank" },
      ...range(21, 37, 2).map(seat),
    ],
  });

  // A3 → A8 — 24 مقعدًا لكل صف
  [39, 63, 87, 111, 135, 159].forEach((base, idx) => {
    rows.push({
      label: `A${idx + 3}`,
      count: 24,
      cells: [
        ...range(base + 22, base, -2).map(seat),
        ...range(base + 1, base + 23, 2).map(seat),
      ],
    });
  });

  // B1 → B6 — 30 مقعدًا لكل صف
  [183, 213, 243, 273, 303, 333].forEach((base, idx) => {
    rows.push({
      label: `B${idx + 1}`,
      count: 30,
      cells: [
        ...range(base + 29, base + 1, -2).map(seat),
        ...range(base, base + 28, 2).map(seat),
      ],
    });
  });

  return rows;
}

const HALL_ROWS = buildHall();
const HALL_TOTAL = HALL_ROWS.reduce((s, r) => s + r.count, 0);



function useSeatData() {
  return useQuery({
    queryKey: ["seat-map"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [{ data: events }, { data: invitees }, { data: invitations }, { data: attendance }] =
        await Promise.all([
          db.from("events").select("id, name, start_date").order("start_date", { ascending: false }),
          db.from("invitees").select("id, full_name, organization, invitee_type, phone"),
          db
            .from("invitations")
            .select("id, event_id, invitee_id, status, seat_area, seat_row, seat_number"),
          db.from("attendance").select("invitee_id, event_id, checked_in_at"),
        ]);
      const eventId: string | null = events?.[0]?.id ?? null;
      const present = new Set(
        (attendance ?? [])
          .filter((a: any) => (!eventId || a.event_id === eventId) && a.invitee_id)
          .map((a: any) => a.invitee_id),
      );
      return {
        eventId,
        eventName: events?.[0]?.name ?? null,
        invitees: invitees ?? [],
        invitations: (invitations ?? []).filter((v: any) => !eventId || v.event_id === eventId),
        present,
      };
    },
  });
}

export function SeatMap() {
  const { canRegister } = useRoles();
  const queryClient = useQueryClient();
  const { data, isLoading } = useSeatData();

  const [area, setArea] = useState(DEFAULT_AREA);
  const [picker, setPicker] = useState<{ row: string; col: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: "", organization: "", phone: "", type: "guest" });
  const [hover, setHover] = useState<
    { seat: SeatData | null; row: string; col: number; x: number; y: number } | null
  >(null);


  const seatIndex = useMemo(() => {
    const map = new Map<string, SeatData>();
    (data?.invitations ?? []).forEach((v: any) => {
      if (!v.seat_row || !v.seat_number) return;
      const a = (v.seat_area ?? "").trim() || DEFAULT_AREA;
      if (normalize(a) !== normalize(area)) return;
      const invitee = (data?.invitees ?? []).find((i: any) => i.id === v.invitee_id);
      map.set(`${String(v.seat_row).trim()}-${String(v.seat_number).trim()}`, {
        invitationId: v.id,
        inviteeId: v.invitee_id,
        name: invitee?.full_name ?? "مدعو",
        organization: invitee?.organization ?? null,
        inviteeType: invitee?.invitee_type ?? null,
        phone: invitee?.phone ?? null,
        status: v.status ?? null,
        present: data?.present.has(v.invitee_id) ?? false,
      });
    });
    return map;
  }, [data, area]);

  const areas = useMemo(() => {
    const s = new Set<string>([DEFAULT_AREA]);
    (data?.invitations ?? []).forEach((v: any) => {
      const a = (v.seat_area ?? "").trim();
      if (a) s.add(a);
    });
    return [...s];
  }, [data]);

  const seatedIds = useMemo(
    () => new Set([...seatIndex.values()].map((s) => s.inviteeId)),
    [seatIndex],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["seat-map"] });
    queryClient.invalidateQueries({ queryKey: ["attendance-board"] });
  };

  const familyName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? (parts[parts.length - 1] ?? name) : name;
  };

  const exportSeatMapPdf = () => {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const rowsHtml = HALL_ROWS.map((hallRow) => {
      const cells = hallRow.cells
        .map((cell) => {
          if (cell.kind === "table")
            return `<span class="cell table" title="طاولة"></span>`;
          if (cell.kind === "blank") return `<span class="cell blank"></span>`;
          const s = seatIndex.get(`${hallRow.label}-${cell.n}`);
          const cls = s ? (s.present ? "cell present" : "cell reserved") : "cell";
          const label = s ? esc(familyName(s.name)) : "";
          return `<span class="${cls}"><b>${cell.n}</b><i>${label}</i></span>`;
        })
        .join("");
      return `<div class="row"><span class="rlabel">${hallRow.label}</span><div class="cells">${cells}</div><span class="rcount">${hallRow.count}</span></div>`;
    }).join("");

    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) {
      toast.error("تعذّر فتح نافذة الطباعة");
      return;
    }
    win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>خريطة المقاعد — ${esc(area)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; font-family: "Segoe UI", Tahoma, Arial, sans-serif; }
  body { margin: 0; color: #12233f; }
  h1 { font-size: 18px; margin: 0 0 2px; color: #0e2a52; }
  .sub { font-size: 11px; color: #64748b; margin-bottom: 10px; }
  .stage { width: 60%; margin: 0 auto 12px; padding: 5px; text-align: center; font-size: 12px;
    font-weight: 700; letter-spacing: 3px; color: #0e2a52; background: #e8eef8;
    border-bottom: 3px solid #0e2a52; border-radius: 0 0 12px 12px; }
  .map { direction: ltr; }
  .row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .rlabel { width: 30px; text-align: center; font-size: 10px; font-weight: 700; color: #0e2a52; }
  .rcount { width: 30px; text-align: center; font-size: 9px; color: #64748b; }
  .cells { flex: 1; display: flex; justify-content: center; gap: 3px; }
  .cell { width: 26px; height: 28px; border: 1px solid #cbd5e1; border-radius: 3px;
    background: #f8fafc; display: flex; flex-direction: column; align-items: center;
    justify-content: center; overflow: hidden; }
  .cell b { font-size: 8px; line-height: 1; color: #475569; }
  .cell i { font-style: normal; font-size: 7px; line-height: 1.15; font-weight: 600;
    max-width: 100%; padding: 0 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cell.reserved { background: #fdf0dc; border-color: #d97706; }
  .cell.reserved i { color: #92400e; }
  .cell.present { background: #0e2a52; border-color: #0e2a52; }
  .cell.present b, .cell.present i { color: #fff; }
  .cell.table { width: 24px; height: 24px; border-radius: 50%; background: #12233f; border: none; align-self: center; }
  .cell.blank { width: 28px; height: 24px; background: #fbbf24; border: 1px solid #d97706; align-self: center; }
  .legend { display: flex; gap: 18px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #475569; }
  .legend span { display: flex; align-items: center; gap: 5px; }
  .sw { width: 12px; height: 12px; border-radius: 2px; border: 1px solid #cbd5e1; display: inline-block; }
  .footer { margin-top: 12px; text-align: center; font-size: 10px; color: #94a3b8; }
</style></head><body>
<h1>خريطة المقاعد — ${esc(area)}</h1>
<p class="sub">إجمالي المقاعد: ${HALL_TOTAL} · المحجوز: ${seatIndex.size} · ${new Date().toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</p>
<div class="map" dir="ltr">
<div class="stage">المنصة · STAGE</div>
${rowsHtml}
</div>
<div class="legend">
  <span><i class="sw" style="background:#f8fafc"></i> شاغر</span>
  <span><i class="sw" style="background:#fdf0dc;border-color:#d97706"></i> محجوز</span>
  <span><i class="sw" style="background:#0e2a52"></i> حاضر</span>
  <span><i class="sw" style="background:#12233f;border-radius:50%"></i> طاولة</span>
  <span><i class="sw" style="background:#fbbf24"></i> مساحة محجوزة</span>
</div>
<p class="footer">نفذ بواسطة نايف الرويس</p>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 500); };<\/script>
</body></html>`);
    win.document.close();
  };

  const assign = useMutation({
    mutationFn: async ({ inviteeId, row, col }: { inviteeId: string; row: string; col: number }) => {
      const eventId = data?.eventId;
      if (!eventId) throw new Error("لا توجد فعالية مسجّلة");
      const existing = (data?.invitations ?? []).find((v: any) => v.invitee_id === inviteeId);
      const payload = {
        seat_area: area.trim() || DEFAULT_AREA,
        seat_row: String(row),
        seat_number: String(col),
      };
      if (existing) {
        const { error } = await db.from("invitations").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("invitations")
          .insert({ event_id: eventId, invitee_id: inviteeId, status: "accepted", ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setPicker(null);
      setPickerSearch("");
      invalidate();
      toast.success("تم تعيين المقعد");
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر تعيين المقعد"),
  });

  const clear = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await db
        .from("invitations")
        .update({ seat_area: null, seat_row: null, seat_number: null })
        .eq("id", invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      setPicker(null);
      invalidate();
      toast.success("تم إخلاء المقعد");
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر إخلاء المقعد"),
  });

  const createAndAssign = useMutation({
    mutationFn: async ({ row, col }: { row: string; col: number }) => {
      const eventId = data?.eventId;
      if (!eventId) throw new Error("لا توجد فعالية مسجّلة");
      const name = manual.name.trim();
      if (!name) throw new Error("الرجاء إدخال اسم الضيف");
      const { data: created, error } = await db
        .from("invitees")
        .insert({
          full_name: name,
          organization: manual.organization.trim() || null,
          phone: manual.phone.trim() || null,
          invitee_type: manual.type,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await db.from("invitations").insert({
        event_id: eventId,
        invitee_id: created.id,
        status: "accepted",
        seat_area: area.trim() || DEFAULT_AREA,
        seat_row: String(row),
        seat_number: String(col),
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      setPicker(null);
      setPickerSearch("");
      setManual({ name: "", organization: "", phone: "", type: "guest" });
      setManualOpen(false);
      invalidate();
      toast.success("تمت إضافة الضيف وتعيين مقعده");
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر إضافة الضيف"),
  });

  const candidates = useMemo(() => {
    const q = normalize(pickerSearch);
    return (data?.invitees ?? [])
      .filter((i: any) => !seatedIds.has(i.id))
      .filter((i: any) =>
        !q
          ? true
          : normalize(i.full_name).includes(q) || normalize(i.organization ?? "").includes(q),
      )
      .slice(0, 60);
  }, [data, seatedIds, pickerSearch]);

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const current = picker ? seatIndex.get(`${picker.row}-${picker.col}`) : undefined;
  const occupied = seatIndex.size;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label>القاعة / المنطقة</Label>
          <Input value={area} onChange={(e) => setArea(e.target.value)} list="seat-areas" />
          <datalist id="seat-areas">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Badge variant="secondary" className="gap-1">
            <Grid3x3 className="size-3" />
            {HALL_TOTAL} مقعد
          </Badge>
          <Badge className="gap-1 bg-accent text-accent-foreground">
            <Armchair className="size-3" />
            {occupied} محجوز
          </Badge>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportSeatMapPdf}>
            <FileDown className="size-4" />
            تصدير PDF
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card p-4">
        <div className="mx-auto mb-6 w-2/3 min-w-[20rem] rounded-b-2xl border-b-4 border-primary bg-primary/10 py-2 text-center text-sm font-semibold tracking-widest text-primary">
          المنصة · STAGE
        </div>
        <div className="min-w-max space-y-1.5" dir="ltr">
          {HALL_ROWS.map((hallRow) => (
            <div key={hallRow.label} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-center text-xs font-bold text-primary">
                {hallRow.label}
              </span>
              <div className="flex flex-1 items-center justify-center gap-1">
                {hallRow.cells.map((cell, idx) => {
                  if (cell.kind === "table")
                    return (
                      <span
                        key={`t-${idx}`}
                        title="طاولة"
                        className="size-7 shrink-0 rounded-full bg-foreground"
                      />
                    );
                  if (cell.kind === "blank")
                    return (
                      <span
                        key={`b-${idx}`}
                        className="h-7 w-8 shrink-0 rounded-sm border border-amber-500 bg-amber-400"
                      />
                    );
                  const col = cell.n;
                  const s = seatIndex.get(`${hallRow.label}-${col}`);
                  return (
                    <button
                      key={`s-${col}`}
                      type="button"
                      onMouseEnter={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setHover({
                          seat: s ?? null,
                          row: hallRow.label,
                          col,
                          x: r.left + r.width / 2,
                          y: r.top,
                        });
                      }}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => canRegister && setPicker({ row: hallRow.label, col })}
                      disabled={!canRegister}
                      className={cn(
                        "flex h-9 w-8 shrink-0 flex-col items-center justify-center overflow-hidden rounded-sm border px-0.5 transition-all",
                        s
                          ? s.present
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-accent bg-accent/30 text-accent-foreground"
                          : "border-border bg-muted/50 text-muted-foreground",
                        canRegister && "hover:z-10 hover:scale-125 hover:border-primary",
                      )}
                    >
                      <span className="text-[9px] font-bold leading-none">{col}</span>
                      {s && (
                        <span className="w-full truncate text-[5px] leading-tight opacity-90">
                          {s.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <span className="w-8 shrink-0 text-center text-[10px] font-semibold text-muted-foreground">
                {hallRow.count}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border bg-muted/50" /> شاغر
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border border-accent bg-accent/30" /> محجوز
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-primary" /> حاضر
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-foreground" /> طاولة
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm border border-amber-500 bg-amber-400" /> مساحة محجوزة
          </span>
        </div>
      </div>


      {hover && (
        <div
          className="pointer-events-none fixed z-50 w-56 -translate-x-1/2 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg"
          style={{
            left: Math.min(Math.max(hover.x, 120), (typeof window !== "undefined" ? window.innerWidth : 1000) - 120),
            top: Math.max(hover.y - 8, 8),
            transform: "translate(-50%, -100%)",
          }}
        >
          <p className="text-[11px] font-bold text-muted-foreground">
            صف {hover.row} · مقعد {hover.col} · {area}
          </p>
          {hover.seat ? (
            <div className="mt-1 space-y-0.5">
              <p className="text-sm font-bold leading-tight">{hover.seat.name}</p>
              {hover.seat.organization && (
                <p className="text-xs text-muted-foreground">{hover.seat.organization}</p>
              )}
              {hover.seat.inviteeType && (
                <p className="text-xs text-muted-foreground">
                  التصنيف: {TYPE_LABELS[hover.seat.inviteeType] ?? hover.seat.inviteeType}
                </p>
              )}
              {hover.seat.phone && (
                <p className="text-xs text-muted-foreground" dir="ltr">
                  {hover.seat.phone}
                </p>
              )}
              <p className="pt-1 text-xs font-semibold">
                {hover.seat.present ? "✅ مسجّل الحضور" : "⏳ لم يسجّل الحضور"}
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm font-semibold">مقعد شاغر</p>
          )}
        </div>
      )}


      <Dialog
        open={!!picker}
        onOpenChange={(o) => {
          if (!o) {
            setPicker(null);
            setPickerSearch("");
            setManualOpen(false);
            setManual({ name: "", organization: "", phone: "", type: "guest" });
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              مقعد {picker?.col} — صف {picker?.row} · {area}
            </DialogTitle>
          </DialogHeader>

          {current ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-muted/40 p-4">
                <p className="text-lg font-bold">{current.name}</p>
                <p className="text-sm text-muted-foreground">{current.organization ?? "—"}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {current.inviteeType && (
                    <span>التصنيف: {TYPE_LABELS[current.inviteeType] ?? current.inviteeType}</span>
                  )}
                  {current.phone && <span dir="ltr">{current.phone}</span>}
                </div>
                {current.present && (
                  <Badge className="mt-2 gap-1">
                    <CheckCircle2 className="size-3" />
                    مسجّل الحضور
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  className="gap-1"
                  disabled={clear.isPending}
                  onClick={() => clear.mutate(current.invitationId)}
                >
                  <Trash2 className="size-4" />
                  إزالة من المقعد
                </Button>
                <Button
                  variant="outline"
                  className="gap-1"
                  onClick={() => clear.mutate(current.invitationId)}
                >
                  <X className="size-4" />
                  تغيير الضيف
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                type="button"
                variant={manualOpen ? "secondary" : "outline"}
                className="w-full gap-1"
                onClick={() => setManualOpen((v) => !v)}
              >
                <UserPlus className="size-4" />
                {manualOpen ? "إخفاء الإدخال اليدوي" : "إضافة ضيف يدويًا غير مسجّل"}
              </Button>

              {manualOpen && (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                  <div className="space-y-1.5">
                    <Label>اسم الضيف *</Label>
                    <Input
                      value={manual.name}
                      onChange={(e) => setManual({ ...manual, name: e.target.value })}
                      placeholder="الاسم الكامل"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label>الجهة</Label>
                      <Input
                        value={manual.organization}
                        onChange={(e) => setManual({ ...manual, organization: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>الجوال</Label>
                      <Input
                        dir="ltr"
                        value={manual.phone}
                        onChange={(e) => setManual({ ...manual, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>التصنيف</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={manual.type}
                      onChange={(e) => setManual({ ...manual, type: e.target.value })}
                    >
                      <option value="guest">ضيف</option>
                      <option value="vip">كبار الشخصيات</option>
                      <option value="media">إعلام</option>
                      <option value="staff">فريق عمل</option>
                    </select>
                  </div>
                  <Button
                    className="w-full"
                    disabled={createAndAssign.isPending || !manual.name.trim()}
                    onClick={() =>
                      picker && createAndAssign.mutate({ row: picker.row, col: picker.col })
                    }
                  >
                    {createAndAssign.isPending ? "جارٍ الحفظ…" : "إضافة وتعيين المقعد"}
                  </Button>
                </div>
              )}

              <div className="relative">
                <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus={!manualOpen}
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="ابحث عن اسم المدعو…"
                  className="pe-10"
                />
              </div>
              <div className="divide-y rounded-lg border">
                {candidates.length === 0 && (
                  <p className="p-4 text-center text-sm text-muted-foreground">لا توجد أسماء مطابقة</p>
                )}
                {candidates.map((i: any) => (
                  <button
                    key={i.id}
                    type="button"
                    disabled={assign.isPending}
                    onClick={() =>
                      picker &&
                      assign.mutate({ inviteeId: i.id, row: picker.row, col: picker.col })
                    }
                    className="flex w-full items-center justify-between gap-2 p-3 text-start hover:bg-muted"
                  >
                    <span className="truncate font-semibold">{i.full_name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {i.organization ?? ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
