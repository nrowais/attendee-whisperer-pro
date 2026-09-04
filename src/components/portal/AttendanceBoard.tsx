import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  LogOut,
  RotateCcw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const db = supabase as any;

const TYPE_LABELS: Record<string, string> = {
  vip: "كبار الشخصيات",
  guest: "ضيف",
  media: "إعلام",
  staff: "فريق عمل",
};

const TYPE_STYLES: Record<string, string> = {
  vip: "bg-accent/20 text-accent-foreground",
  guest: "bg-primary/10 text-primary",
  media: "bg-muted text-muted-foreground",
  staff: "bg-secondary text-secondary-foreground",
};

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

type Row = {
  id: string;
  full_name: string;
  organization: string | null;
  phone: string | null;
  email: string | null;
  invitee_type: string;
  attendanceId: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  invitationId: string | null;
  invitationStatus: string | null;
  seatArea: string | null;
  seatRow: string | null;
  seatNumber: string | null;
};

function useBoard() {
  return useQuery({
    queryKey: ["attendance-board"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [
        { data: events },
        { data: invitees },
        { data: attendance },
        { data: hotelMoves },
        { data: invitations },
      ] = await Promise.all([
        db.from("events").select("id, name, start_date").order("start_date", { ascending: false }),
        db.from("invitees").select("id, full_name, organization, phone, email, invitee_type"),
        db.from("attendance").select("id, invitee_id, checked_in_at, checked_out_at, event_id"),
        db
          .from("attendance")
          .select("id, checked_in_at, checked_out_at, speakers(full_name)")
          .eq("method", "hotel")
          .order("checked_in_at", { ascending: false })
          .limit(20),
        db
          .from("invitations")
          .select("id, event_id, invitee_id, status, seat_area, seat_row, seat_number"),
      ]);
      const eventId: string | null = events?.[0]?.id ?? null;
      const attMap = new Map<string, any>();
      (attendance ?? [])
        .filter((a: any) => !eventId || a.event_id === eventId)
        .forEach((a: any) => attMap.set(a.invitee_id, a));

      const invMap = new Map<string, any>();
      (invitations ?? [])
        .filter((v: any) => !eventId || v.event_id === eventId)
        .forEach((v: any) => invMap.set(v.invitee_id, v));

      const rows: Row[] = (invitees ?? []).map((i: any) => {
        const att = attMap.get(i.id);
        const inv = invMap.get(i.id);
        return {
          ...i,
          attendanceId: att?.id ?? null,
          checkedInAt: att?.checked_in_at ?? null,
          checkedOutAt: att?.checked_out_at ?? null,
          invitationId: inv?.id ?? null,
          invitationStatus: inv?.status ?? null,
          seatArea: inv?.seat_area ?? null,
          seatRow: inv?.seat_row ?? null,
          seatNumber: inv?.seat_number ?? null,
        };
      });
      rows.sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
      return { rows, eventId, eventName: events?.[0]?.name ?? null, hotelMoves: hotelMoves ?? [] };
    },
  });
}

export function AttendanceBoard() {
  const { canRegister, canDelete } = useRoles();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useBoard();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "present" | "absent">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [seatRow, setSeatRow] = useState<Row | null>(null);
  const [seatForm, setSeatForm] = useState({ seat_area: "", seat_row: "", seat_number: "" });

  const openSeat = (r: Row) => {
    setSeatRow(r);
    setSeatForm({
      seat_area: r.seatArea ?? "",
      seat_row: r.seatRow ?? "",
      seat_number: r.seatNumber ?? "",
    });
  };

  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({
    full_name: "",
    organization: "",
    phone: "",
    invitee_type: "guest",
  });

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const rows = data?.rows ?? [];
  const eventId = data?.eventId ?? null;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance-board"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const checkIn = useMutation({
    mutationFn: async (row: Row) => {
      if (!eventId) throw new Error("لا توجد فعالية مسجّلة");
      const { error } = await db.from("attendance").insert({
        event_id: eventId,
        invitee_id: row.id,
        checked_in_at: new Date().toISOString(),
        method: "manual",
        checked_in_by: user?.id ?? null,
      });
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      setHighlighted(row.id);
      setTimeout(() => setHighlighted((h) => (h === row.id ? null : h)), 3000);
      invalidate();
      toast.success(`تم تأكيد حضور: ${row.full_name}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر تسجيل الحضور"),
  });

  const undo = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await db.from("attendance").delete().eq("id", row.attendanceId);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      invalidate();
      toast.success(`تم التراجع عن حضور: ${row.full_name}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر التراجع"),
  });

  const checkOut = useMutation({
    mutationFn: async (row: Row) => {
      const { error } = await db
        .from("attendance")
        .update({ checked_out_at: new Date().toISOString() })
        .eq("id", row.attendanceId);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      setHighlighted(row.id);
      setTimeout(() => setHighlighted((h) => (h === row.id ? null : h)), 3000);
      invalidate();
      toast.success(`تم تسجيل خروج: ${row.full_name}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر تسجيل الخروج"),
  });

  const addGuest = useMutation({
    mutationFn: async () => {
      const name = newGuest.full_name.trim();
      if (!name) throw new Error("الاسم مطلوب");
      const { error } = await db.from("invitees").insert({
        full_name: name,
        organization: newGuest.organization.trim() || null,
        phone: newGuest.phone.trim() || null,
        invitee_type: newGuest.invitee_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAddOpen(false);
      setNewGuest({ full_name: "", organization: "", phone: "", invitee_type: "guest" });
      invalidate();
      toast.success("تمت إضافة الاسم");
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّرت الإضافة"),
  });

  const filtered = useMemo(() => {
    const q = normalize(search);
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.invitee_type !== typeFilter) return false;
      if (filter === "present" && !r.attendanceId) return false;
      if (filter === "absent" && r.attendanceId) return false;
      if (!q) return true;
      return (
        normalize(r.full_name).includes(q) ||
        normalize(r.organization ?? "").includes(q) ||
        (r.phone ?? "").includes(search.trim())
      );
    });
  }, [rows, search, filter, typeFilter]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      present: rows.filter((r) => r.attendanceId).length,
    }),
    [rows],
  );
  const absent = counts.total - counts.present;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* مؤشرات سريعة */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<Users className="size-4" />} label="إجمالي المدعوين" value={counts.total} />
        <StatCard
          icon={<CheckCircle2 className="size-4" />}
          label="حضروا"
          value={counts.present}
          tone="success"
        />
        <StatCard icon={<Clock className="size-4" />} label="لم يحضروا" value={absent} />
      </div>

      {/* البحث والفلاتر */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute end-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الجهة أو الجوال…"
            className="h-12 pe-11 text-base"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="مسح البحث"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: "all", label: "الكل" },
              { key: "absent", label: "لم يحضر" },
              { key: "present", label: "حضر" },
            ] as const
          ).map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {Object.entries(TYPE_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canRegister && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <UserPlus className="size-4" />
                  اسم جديد
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة مدعو جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>الاسم الكامل *</Label>
                    <Input
                      value={newGuest.full_name}
                      onChange={(e) => setNewGuest({ ...newGuest, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الجهة</Label>
                    <Input
                      value={newGuest.organization}
                      onChange={(e) => setNewGuest({ ...newGuest, organization: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الجوال</Label>
                    <Input
                      value={newGuest.phone}
                      onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>التصنيف</Label>
                    <Select
                      value={newGuest.invitee_type}
                      onValueChange={(v) => setNewGuest({ ...newGuest, invitee_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => addGuest.mutate()} disabled={addGuest.isPending}>
                    حفظ
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* القائمة */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          لا توجد نتائج مطابقة للبحث
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 200).map((r) => {
            const present = !!r.attendanceId;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-3 transition-all",
                  present && "border-primary/30 bg-primary/5",
                  highlighted === r.id && "ring-2 ring-primary",
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    present ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {present ? <CheckCircle2 className="size-5" /> : <Users className="size-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{r.full_name}</span>
                    <Badge
                      variant="secondary"
                      className={cn("text-[11px]", TYPE_STYLES[r.invitee_type])}
                    >
                      {TYPE_LABELS[r.invitee_type] ?? r.invitee_type}
                    </Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[r.organization, r.phone].filter(Boolean).join(" · ") || "—"}
                    {present && r.checkedInAt && (
                      <span className="text-primary">
                        {" · دخل "}
                        <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                          {new Date(r.checkedInAt).toLocaleTimeString("ar-SA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    )}
                    {r.checkedOutAt && (
                      <span className="text-muted-foreground">
                        {" · خرج "}
                        <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                          {new Date(r.checkedOutAt).toLocaleTimeString("ar-SA", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {present ? (
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {r.checkedOutAt ? (
                      <Badge variant="secondary" className="gap-1">
                        <LogOut className="size-3" />
                        تم تسجيل الخروج
                      </Badge>
                    ) : (
                      canRegister && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={checkOut.isPending}
                          onClick={() => checkOut.mutate(r)}
                        >
                          <LogOut className="size-4" />
                          تسجيل الخروج
                        </Button>
                      )
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        disabled={undo.isPending}
                        onClick={() => undo.mutate(r)}
                      >
                        <RotateCcw className="size-4" />
                        تراجع
                      </Button>
                    )}
                  </div>
                ) : (
                  canRegister && (
                    <Button
                      size="sm"
                      className="gap-1"
                      disabled={checkIn.isPending}
                      onClick={() => checkIn.mutate(r)}
                    >
                      <CheckCircle2 className="size-4" />
                      تأكيد الحضور
                    </Button>
                  )
                )}
              </div>
            );
          })}
          {filtered.length > 200 && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              يعرض أول 200 نتيجة — استخدم البحث لتضييق النطاق ({filtered.length} إجمالاً)
            </p>
          )}
        </div>
      )}

      {/* سجل دخول/خروج الفنادق — مرتبط بتسجيل الفندق من صفحة المتحدثين */}
      {(data?.hotelMoves?.length ?? 0) > 0 && (
        <div className="space-y-2 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <LogOut className="size-4 text-primary" />
            <p className="font-display font-bold">سجل دخول وخروج الفنادق (المتحدثون)</p>
          </div>
          <div className="divide-y divide-border">
            {data!.hotelMoves.map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                <span className="min-w-40 flex-1 font-semibold">
                  {m.speakers?.full_name ?? "متحدث"}
                </span>
                <span className="text-muted-foreground">
                  دخل الفندق{" "}
                  <span dir="ltr" className="text-primary" style={{ unicodeBidi: "embed" }}>
                    {new Date(m.checked_in_at).toLocaleString("ar-SA-u-ca-gregory", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {m.checked_out_at ? (
                    <>
                      خرج{" "}
                      <span dir="ltr" style={{ unicodeBidi: "embed" }}>
                        {new Date(m.checked_out_at).toLocaleString("ar-SA-u-ca-gregory", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </>
                  ) : (
                    "لم يخرج بعد"
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone?: "success";
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-bold", tone === "success" && "text-primary")}>
        {value}
      </div>
    </div>
  );
}
