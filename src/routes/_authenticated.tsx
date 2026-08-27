import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles, roleLabels } from "@/hooks/useAuth";
import { navGroups } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated")({
  component: PortalLayout,
});

function PortalLayout() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { roles } = useRoles();
  const [openNav, setOpenNav] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="text-sm text-muted-foreground">جارٍ التحميل…</span>
      </div>
    );
  }

  const roleLabel = roles[0] ? roleLabels[roles[0]] : "مطّلع";

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`fixed inset-y-0 start-0 z-40 w-64 shrink-0 overflow-y-auto bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          openNav ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-5">
          <div>
            <p className="font-display text-base font-bold">بوابة الفعاليات</p>
            <p className="text-xs text-sidebar-foreground/60">إدارة متكاملة</p>
          </div>
          <button className="lg:hidden" onClick={() => setOpenNav(false)} aria-label="إغلاق">
            <X className="size-5" />
          </button>
        </div>

        <nav className="space-y-6 px-3 py-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpenNav(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{
                      className:
                        "block rounded-lg px-3 py-2 text-sm bg-sidebar-primary text-sidebar-primary-foreground font-semibold",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {openNav ? (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpenNav(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background/85 px-5 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpenNav(true)} aria-label="القائمة">
            <Menu className="size-5" />
          </button>
          <div className="flex flex-1 items-center justify-end gap-3">
            <div className="text-end">
              <p className="text-sm font-medium text-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-0.5">
                {roleLabel}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
              aria-label="تسجيل الخروج"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
