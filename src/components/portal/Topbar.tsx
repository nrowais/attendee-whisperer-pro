import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, History, LogOut, Menu, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { eventName } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import eventLogo from "@/assets/event-logo.png.asset.json";
import { useAuth } from "@/hooks/useAuth";

function formatNow(d: Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function stateVariant(title?: string) {
  if (!title) return "default" as const;
  if (title.includes("تنبيه")) return "destructive" as const;
  if (title.includes("إشعار")) return "secondary" as const;
  return "default" as const;
}

type Props = {
  email: string;
  roleLabel: string;
  onMenu: () => void;
  onSignOut: () => void;
};

export function Topbar({ email, roleLabel, onMenu, onSignOut }: Props) {
  const [now, setNow] = useState<string>("");
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const notifications = useQuery({
    queryKey: ["topbar-notifications", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = notifications.data ?? [];
  const unread = list.filter((n: any) => !n.is_read);
  const latest = list.slice(0, 6);

  useEffect(() => {
    const tick = () => setNow(formatNow(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button className="lg:hidden" onClick={onMenu} aria-label="القائمة">
          <Menu className="size-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2">
          <img
            src={eventLogo.url}
            alt="شعار الفعالية"
            className="hidden h-9 w-auto rounded-md object-contain sm:block"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-foreground lg:text-base">{eventName}</p>
            <p className="truncate text-xs text-muted-foreground">{now}</p>
          </div>
        </div>

        <div className="relative mx-auto hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
          <Input placeholder="ابحث عن متحدث، مدعو، رحلة…" className="pe-9" aria-label="بحث" />
        </div>

        <div className="ms-auto flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
                <Bell className="size-4" />
                {unread.length > 0 ? (
                  <span className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unread.length}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[22rem] p-0" dir="rtl">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="font-display text-sm font-bold text-foreground">آخر التحديثات</p>
                <Badge variant="secondary">{latest.length}</Badge>
              </div>
              <Separator />
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {latest.length === 0 ? (
                  <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                    لا توجد إشعارات حاليًا
                  </li>
                ) : (
                  latest.map((n: any) => (
                    <li key={n.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <Badge variant={stateVariant(n.title)} className="shrink-0">
                          {n.is_read ? "مقروء" : "جديد"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleString("ar-SA-u-ca-gregory")}
                      </p>
                    </li>
                  ))
                )}
              </ul>
              <Separator />
              <div className="p-2">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-center gap-2"
                  onClick={() => setOpen(false)}
                >
                  <Link to="/notifications">
                    <BellRing className="size-4" />
                    عرض كل الإشعارات
                  </Link>
                </Button>
              </div>
              <div className="px-2 pb-2">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-center gap-2"
                  onClick={() => setOpen(false)}
                >
                  <Link to="/activity">
                    <History className="size-4" />
                    فتح سجل النشاط
                  </Link>
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="hidden text-end sm:block">
            <p className="max-w-[180px] truncate text-sm font-medium text-foreground">{email}</p>
            <Badge variant="secondary" className="mt-0.5">
              {roleLabel}
            </Badge>
          </div>

          <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="تسجيل الخروج">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      <div className="relative mt-3 md:hidden">
        <Search className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
        <Input placeholder="بحث…" className="pe-9" aria-label="بحث" />
      </div>
    </header>
  );
}
