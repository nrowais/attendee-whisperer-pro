import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { eventName } from "@/lib/nav";

function formatNow(d: Date) {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type Props = {
  email: string;
  roleLabel: string;
  notifications?: number;
  onMenu: () => void;
  onSignOut: () => void;
};

export function Topbar({ email, roleLabel, notifications = 3, onMenu, onSignOut }: Props) {
  const [now, setNow] = useState<string>("");

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

        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-foreground lg:text-base">{eventName}</p>
          <p className="truncate text-xs text-muted-foreground">{now}</p>
        </div>

        <div className="relative mx-auto hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground" />
          <Input placeholder="ابحث عن متحدث، مدعو، رحلة…" className="pe-9" aria-label="بحث" />
        </div>

        <div className="ms-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
            <Bell className="size-4" />
            {notifications > 0 ? (
              <span className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {notifications}
              </span>
            ) : null}
          </Button>

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
