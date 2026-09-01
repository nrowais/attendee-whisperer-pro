import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BedDouble, Search, LogIn, LogOut, Pencil, Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const db = supabase as any;

const STATUS_LABELS: Record<string, string> = {
  reserved: "محجوزة",
  checked_in: "تم تسجيل الدخول",
  checked_out: "تم تسجيل الخروج",
  cancelled: "ملغاة",
};

const STATUS_STYLES: Record<string, string> = {
  reserved: "bg-muted text-muted-foreground",
  checked_in: "bg-primary/10 text-primary",
  checked_out: "bg-accent/15 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

type Booking = {
  id: string;
  speaker_id: string | null;
  hotel_id: string | null;
  room_number: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  notes: string | null;
  speakerName: string;
  hotelName: string;
};

function useBookings() {
  return useQuery({
    queryKey: ["hotel-checkin-board"],
    refetchInterval: 30_000,
    queryFn: async (): Promise<{ rows: Booking[]; hotels: { id: string; name: string }[] }> => {
      const [{ data: bookings }, { data: speakers }, { data: hotels }] = await Promise.all([
        db.from("hotel_bookings").select("*"),
        db.from("speakers").select("id, full_name"),
        db.from("hotels").select("id, name").order("name"),
      ]);
      const speakerMap = new Map<string, string>(
        (speakers ?? []).map((s: any) => [s.id, s.full_name]),
      );
      const hotelMap = new Map<string, string>((hotels ?? []).map((h: any) => [h.id, h.name]));
      const rows: Booking[] = (bookings ?? []).map((b: any) => ({
        ...b,
        speakerName: speakerMap.get(b.speaker_id) ?? "—",
        hotelName: hotelMap.get(b.hotel_id) ?? "—",
      }));
      rows.sort((a, b) => a.speakerName.localeCompare(b.speakerName, "ar"));
      return { rows, hotels: (hotels ?? []) as { id: string; name: string }[] };
    },
  });
}

export function HotelCheckIn() {
  const { canEditOps, canEdit } = useRoles();
  const queryClient = useQueryClient();
  const { data, isLoading } = useBookings();
  const [search, setSearch] = useState("");
  const [hotelFilter, setHotelFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Booking | null>(null);
  const [form, setForm] = useState<Partial<Booking>>({});
  const [roomDrafts, setRoomDrafts] = useState<Record<string, string>>({});

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await db.from("hotel_bookings").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-checkin-board"] });
      queryClient.invalidateQueries({ queryKey: ["speakers-status-board"] });
      toast.success("تم حفظ التعديل");
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر الحفظ"),
  });

  const rows = data?.rows ?? [];
  const hotels = data?.hotels ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (hotelFilter !== "all" && r.hotel_id !== hotelFilter) return false;
      if (!q) return true;
      return (
        r.speakerName.toLowerCase().includes(q) ||
        r.hotelName.toLowerCase().includes(q) ||
        (r.room_number ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, hotelFilter]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      checkedIn: rows.filter((r) => r.status === "checked_in").length,
      withRoom: rows.filter((r) => (r.room_number ?? "").trim() !== "").length,
    }),
    [rows],
  );

  const openEdit = (row: Booking) => {
    setEditing(row);
    setForm({
      room_number: row.room_number ?? "",
      check_in: row.check_in ?? "",
      check_out: row.check_out ?? "",
      notes: row.notes ?? "",
      hotel_id: row.hotel_id,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "إجمالي الحجوزات", value: counts.total },
          { label: "مسجّل دخوله", value: counts.checkedIn },
          { label: "لديه رقم غرفة", value: counts.withRoom },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="font-display text-xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-2.5 start-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المتحدث أو رقم الغرفة"
            className="ps-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={hotelFilter === "all" ? "default" : "outline"}
            onClick={() => setHotelFilter("all")}
          >
            كل الفنادق
          </Button>
          {hotels.map((h) => (
            <Button
              key={h.id}
              size="sm"
              variant={hotelFilter === h.id ? "default" : "outline"}
              onClick={() => setHotelFilter(h.id)}
            >
              {h.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((row) => {
          const draft = roomDrafts[row.id] ?? row.room_number ?? "";
          const dirty = draft.trim() !== (row.room_number ?? "").trim();
          return (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="min-w-48 flex-1">
                <p className="truncate text-sm font-semibold">{row.speakerName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.hotelName} · {row.check_in ?? "—"} ← {row.check_out ?? "—"}
                </p>
              </div>

              <Badge className={cn("border-0", STATUS_STYLES[row.status] ?? "")}>
                {STATUS_LABELS[row.status] ?? row.status}
              </Badge>

              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <Input
                  value={draft}
                  disabled={!canEditOps}
                  onChange={(e) => setRoomDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                  placeholder="رقم الغرفة"
                  className="h-9 w-28"
                />
                {dirty && (
                  <Button
                    size="sm"
                    onClick={() =>
                      update.mutate({
                        id: row.id,
                        patch: { room_number: draft.trim() || null },
                      })
                    }
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {canEditOps && (
                <div className="flex gap-2">
                  {row.status !== "checked_in" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update.mutate({ id: row.id, patch: { status: "checked_in" } })}
                    >
                      <LogIn className="h-4 w-4" />
                      <span className="ms-1">تسجيل دخول</span>
                    </Button>
                  )}
                  {row.status === "checked_in" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => update.mutate({ id: row.id, patch: { status: "checked_out" } })}
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="ms-1">تسجيل خروج</span>
                    </Button>
                  )}
                  {canEdit && (
                    <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            لا توجد حجوزات مطابقة
          </p>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل حجز — {editing?.speakerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>الفندق</Label>
              <div className="flex flex-wrap gap-2">
                {hotels.map((h) => (
                  <Button
                    key={h.id}
                    type="button"
                    size="sm"
                    variant={form.hotel_id === h.id ? "default" : "outline"}
                    onClick={() => setForm((f) => ({ ...f, hotel_id: h.id }))}
                  >
                    {h.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>رقم الغرفة</Label>
                <Input
                  value={(form.room_number as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الدخول</Label>
                <Input
                  type="date"
                  value={(form.check_in as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الخروج</Label>
                <Input
                  type="date"
                  value={(form.check_out as string) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, check_out: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea
                value={(form.notes as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!editing) return;
                update.mutate(
                  {
                    id: editing.id,
                    patch: {
                      hotel_id: form.hotel_id ?? null,
                      room_number: ((form.room_number as string) ?? "").trim() || null,
                      check_in: (form.check_in as string) || null,
                      check_out: (form.check_out as string) || null,
                      notes: ((form.notes as string) ?? "").trim() || null,
                    },
                  },
                  { onSuccess: () => setEditing(null) },
                );
              }}
            >
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground">نفذ بواسطة نايف الرويس</p>
    </div>
  );
}
