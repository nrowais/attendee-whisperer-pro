import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Armchair, CheckCircle2, Grid3x3, Search, Trash2, X } from "lucide-react";

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
  const [rowsCount, setRowsCount] = useState(8);
  const [colsCount, setColsCount] = useState(12);
  const [picker, setPicker] = useState<{ row: number; col: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

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

  const assign = useMutation({
    mutationFn: async ({ inviteeId, row, col }: { inviteeId: string; row: number; col: number }) => {
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
    mutationFn: async ({ row, col }: { row: number; col: number }) => {
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
        <div className="w-28 space-y-1.5">
          <Label>عدد الصفوف</Label>
          <Input
            type="number"
            min={1}
            max={40}
            value={rowsCount}
            onChange={(e) => setRowsCount(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>
        <div className="w-28 space-y-1.5">
          <Label>مقاعد الصف</Label>
          <Input
            type="number"
            min={1}
            max={40}
            value={colsCount}
            onChange={(e) => setColsCount(Math.min(40, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>
        <div className="flex items-center gap-2 pb-1">
          <Badge variant="secondary" className="gap-1">
            <Grid3x3 className="size-3" />
            {rowsCount * colsCount} مقعد
          </Badge>
          <Badge className="gap-1 bg-accent text-accent-foreground">
            <Armchair className="size-3" />
            {occupied} محجوز
          </Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card p-4">
        <div className="mx-auto mb-5 w-2/3 rounded-b-2xl border-b-4 border-primary bg-primary/10 py-2 text-center text-sm font-semibold text-primary">
          المنصة
        </div>
        <div className="space-y-2">
          {Array.from({ length: rowsCount }, (_, r) => r + 1).map((row) => (
            <div key={row} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-center text-xs font-bold text-muted-foreground">
                صف {row}
              </span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {Array.from({ length: colsCount }, (_, c) => c + 1).map((col) => {
                  const seat = seatIndex.get(`${row}-${col}`);
                  return (
                    <button
                      key={col}
                      type="button"
                      title={seat ? `${seat.name}${seat.organization ? ` — ${seat.organization}` : ""}` : `مقعد شاغر ${col}`}
                      onClick={() => canRegister && setPicker({ row, col })}
                      disabled={!canRegister}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-md border text-[11px] font-bold transition-all",
                        seat
                          ? seat.present
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-accent bg-accent/25 text-accent-foreground"
                          : "border-dashed border-border bg-muted/40 text-muted-foreground",
                        canRegister && "hover:scale-110 hover:border-primary",
                      )}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-dashed bg-muted/40" /> شاغر
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded border border-accent bg-accent/25" /> محجوز
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-primary" /> حاضر
          </span>
        </div>
      </div>

      <Dialog
        open={!!picker}
        onOpenChange={(o) => {
          if (!o) {
            setPicker(null);
            setPickerSearch("");
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
              <div className="relative">
                <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
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
