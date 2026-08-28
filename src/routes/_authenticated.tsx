import { useEffect, useState } from "react";
import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, useRoles, roleLabels } from "@/hooks/useAuth";
import { navGroups } from "@/lib/nav";
import { Topbar } from "@/components/portal/Topbar";

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

        <nav className="space-y-1 px-3 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpenNav(false)}
                className="flex items-start gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{
                  className:
                    "flex items-start gap-3 rounded-lg px-3 py-3 text-sm bg-sidebar-primary text-sidebar-primary-foreground font-semibold",
                }}
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block">{item.label}</span>
                  {item.hint ? (
                    <span className="block text-[11px] font-normal opacity-70">{item.hint}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

      </aside>

      {openNav ? (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpenNav(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={user.email ?? ""}
          roleLabel={roleLabel}
          onMenu={() => setOpenNav(true)}
          onSignOut={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
        />

        <main className="flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
