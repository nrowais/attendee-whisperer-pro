import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const db = supabase as any;

export const Route = createFileRoute("/_authenticated/gate")({
  head: () => ({
    meta: [
      { title: "بوابة تسجيل الحضور — حوار الأمن والتاريخ" },
      {
        name: "description",
        content: "شاشة مبسّطة لمسجّل الحضور: بحث سريع، تأكيد حضور، تراجع، وإضافة اسم جديد.",
      },
      { property: "og:title", content: "بوابة تسجيل الحضور — حوار الأمن والتاريخ" },
      { property: "og:description", content: "تسجيل حضور الضيوف بضغطة واحدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GateScreen,
});

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

type GateRow = {
  id: string;
  full_name: string;
  organization: string | null;
  phone: string | null;
  invitee_type: string;
  attendanceId: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  seat: string | null;
};

function useGateData() {
  return useQuery({
    queryKey: ["gate-board"],
    refetchInterval: 20_000,
    queryFn: async () => {
      const [{ data: events }, { data: invitees }, { data: attendance }, { data: invitations }] =
        await Promise.all([
          db.from("events").select("id, name, start_date").order("start_date", { ascending: false }),
          db.from("invitees").select("id, full_name, organization, phone, invitee_type"),
          db.from("attendance").select("id, invitee_id, checked_in_at, checked_out_at, event_id"),
          db.from("invitations").select("invitee_id, event_id, seat_area, seat_row, seat_number"),
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

      const rows: GateRow[] = (invitees ?? []).map((i: any) => {
        const att = attMap.get(i.id);
        const inv = invMap.get(i.id);
        const seatParts = [
          inv?.seat_area ? `${inv.seat_area}` : null,
          inv?.seat_row ? `صف ${inv.seat_row}` : null,
          inv?.seat_number ? `مقعد ${inv.seat_number}` : null,
        ].filter(Boolean);
        return {
          id: i.id,
          full_name: i.full_name,
          organization: i.organization ?? null,
          phone: i.phone ?? null,
          invitee_type: i.invitee_type,
          attendanceId: att?.id ?? null,
          checkedInAt: att?.checked_in_at ?? null,
          checkedOutAt: att?.checked_out_at ?? null,
          seat: seatParts.length ? seatParts.join(" · ") : null,
        };
      });
      rows.sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
      return { rows, eventId, eventName: events?.[0]?.name ?? null };
    },
  });
}

function timeOf(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  });
}

function GateScreen() {
  const { user } = useAuth();
  const { canRegister } = useRoles();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGateData();
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<{ id: string; kind: "in" | "out" | "undo" } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newGuest, setNewGuest] = useState({ full_name: "", organization: "", phone: "" });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const rows = data?.rows ?? [];
  const eventId = data?.eventId ?? null;

  const invalidate = () => {
    for (const key of ["gate-board", "attendance-board", "dashboard", "guest-journey", "seat-map"]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const pulse = (id: string, kind: "in" | "out" | "undo") => {
    setFlash({ id, kind });
    setTimeout(() => setFlash((f) => (f?.id === id ? null : f)), 2500);
  };

  const checkIn = useMutation({
    mutationFn: async (row: GateRow) => {
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
      pulse(row.id, "in");
      invalidate();
      toast.success(`تم تسجيل حضور: ${row.full_name}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر تسجيل الحضور"),
  });

  const checkOut = useMutation({
    mutationFn: async (row: GateRow) => {
      const { error } = await db
        .from("attendance")
        .update({ checked_out_at: new Date().toISOString() })
        .eq("id", row.attendanceId);
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      pulse(row.id, "out");
      invalidate();
      toast.success(`تم تسجيل خروج: ${row.full_name}`);
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر تسجيل الخروج"),
  });

  const undo = useMutation({
    mutationFn: async (row: GateRow) => {
      if (row.checkedOutAt) {
        const { error } = await db
          .from("attendance")
          .update({ checked_out_at: null })
          .eq("id", row.attendanceId);
        if (error) throw error;
        return { row, mode: "out" as const };
      }
      const { error } = await db.from("attendance").delete().eq("id", row.attendanceId);
      if (error) throw error;
      return { row, mode: "in" as const };
    },
    onSuccess: ({ row, mode }) => {
      pulse(row.id, "undo");
      invalidate();
      toast.success(
        mode === "out"
          ? `تم التراجع عن الخروج: ${row.full_name}`
          : `تم التراجع عن الحضور: ${row.full_name}`,
      );
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّر التراجع"),
  });

  const addGuest = useMutation({
    mutationFn: async () => {
      const name = newGuest.full_name.trim();
      if (!name) throw new Error("الاسم مطلوب");
      const { data: created, error } = await db
        .from("invitees")
        .insert({
          full_name: name,
          organization: newGuest.organization.trim() || null,
          phone: newGuest.phone.trim() || null,
          invitee_type: "guest",
        })
        .select("id")
        .single();
      if (error) throw error;
      if (eventId && created?.id) {
        await db.from("attendance").insert({
          event_id: eventId,
          invitee_id: created.id,
          checked_in_at: new Date().toISOString(),
          method: "manual",
          checked_in_by: user?.id ?? null,
        });
      }
      return name;
    },
    onSuccess: (name) => {
      setAddOpen(false);
      setNewGuest({ full_name: "", organization: "", phone: "" });
      invalidate();
      toast.success(`تمت إضافة «${name}» وتسجيل حضوره`);
    },
    onError: (e: any) => toast.error(e?.message ?? "تعذّرت الإضافة"),
  });

  const results = useMemo(() => {
    const q = normalize(search);
    if (!q) return [] as GateRow[];
    return rows
      .filter(
        (r) =>
          normalize(r.full_name).includes(q) ||
          normalize(r.organization ?? "").includes(q) ||
          (r.phone ?? "").includes(search.trim()),
      )
      .slice(0, 40);
  }, [rows, search]);

  const recent = useMemo(
    () =>
      rows
        .filter((r) => r.checkedInAt)
        .sort((a, b) => (b.checkedInAt ?? "").localeCompare(a.checkedInAt ?? ""))
        .slice(0, 8),
    [rows],
  );

  const present = rows.filter((r) => r.attendanceId && !r.checkedOutAt).length;
  const out = rows.filter((r) => r.checkedOutAt).length;

  const list = search.trim() ? results : recent;

  return (
    <div dir="rtl" className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">بوابة تسجيل الحضور</h1>
            <p className="mt-1 text-sm opacity-80">{data?.eventName ?? "حفل الافتتاح"}</p>
          </div>
          <div className="flex gap-3">
            <Kpi label="داخل القاعة" value={present} icon={<CheckCircle2 className="size-4" />} />
            <Kpi label="غادروا" value={out} icon={<LogOut className="size-4" />} />
            <Kpi label="المسجّلون" value={rows.length} icon={<Users className="size-4" />} />
          </div>
        </div>

        <div className="relative mt-5">
          <Search className="pointer-events-none absolute end-4 top-1/2 size-6 -translate-y-1/2 text-primary" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اكتب اسم الضيف أو رقم جواله…"
            className="h-16 rounded-2xl border-0 bg-background pe-14 ps-14 text-lg text-foreground shadow-inner"
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                searchRef.current?.focus();
              }}
              className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-label="مسح البحث"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </div>

        {canRegister ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setNewGuest({ full_name: search.trim(), organization: "", phone: "" });
              setAddOpen(true);
            }}
            className="mt-4 h-12 w-full rounded-2xl text-base font-semibold"
          >
            <UserPlus className="me-2 size-5" />
            إضافة اسم جديد وتسجيل حضوره
          </Button>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {search.trim() ? `نتائج البحث (${results.length})` : "آخر من تم تسجيلهم"}
          </h2>
          {isLoading ? <span className="text-xs text-muted-foreground">جارٍ التحميل…</span> : null}
        </div>

        {list.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {search.trim() ? "لا يوجد اسم مطابق — يمكنك إضافته كاسم جديد." : "ابدأ بالبحث عن اسم الضيف."}
          </div>
        ) : (
          list.map((r) => {
            const inside = !!r.attendanceId && !r.checkedOutAt;
            const left = !!r.checkedOutAt;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border-2 bg-card p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                  inside ? "border-emerald-500/60 bg-emerald-500/5" : "border-border",
                  left && "border-amber-500/60 bg-amber-500/5",
                  flash?.id === r.id && "ring-2 ring-primary",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-foreground">{r.full_name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[r.organization, r.seat].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="mt-1 text-xs font-medium">
                    {left ? (
                      <span className="text-amber-600">غادر {timeOf(r.checkedOutAt)}</span>
                    ) : inside ? (
                      <span className="text-emerald-600">
                        <Clock className="me-1 inline size-3" />
                        حضر {timeOf(r.checkedInAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">لم يسجّل بعد</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {!r.attendanceId ? (
                    <Button
                      className="h-14 min-w-36 rounded-xl text-base font-bold"
                      disabled={!canRegister || checkIn.isPending}
                      onClick={() => checkIn.mutate(r)}
                    >
                      <CheckCircle2 className="me-2 size-5" />
                      تسجيل الحضور
                    </Button>
                  ) : (
                    <>
                      {!left ? (
                        <Button
                          variant="outline"
                          className="h-14 min-w-32 rounded-xl text-base font-semibold"
                          disabled={!canRegister || checkOut.isPending}
                          onClick={() => checkOut.mutate(r)}
                        >
                          <LogOut className="me-2 size-5" />
                          خروج
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        className="h-14 min-w-28 rounded-xl text-base"
                        disabled={!canRegister || undo.isPending}
                        onClick={() => undo.mutate(r)}
                      >
                        <RotateCcw className="me-2 size-5" />
                        تراجع
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>إضافة ضيف جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">الاسم الكامل</Label>
              <Input
                id="g-name"
                value={newGuest.full_name}
                onChange={(e) => setNewGuest((g) => ({ ...g, full_name: e.target.value }))}
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-org">الجهة</Label>
              <Input
                id="g-org"
                value={newGuest.organization}
                onChange={(e) => setNewGuest((g) => ({ ...g, organization: e.target.value }))}
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="g-phone">رقم الجوال</Label>
              <Input
                id="g-phone"
                value={newGuest.phone}
                onChange={(e) => setNewGuest((g) => ({ ...g, phone: e.target.value }))}
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="h-12 w-full text-base"
              disabled={addGuest.isPending}
              onClick={() => addGuest.mutate()}
            >
              حفظ وتسجيل الحضور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-primary-foreground/10 px-4 py-2 text-center">
      <div className="flex items-center justify-center gap-1 text-xs opacity-80">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
