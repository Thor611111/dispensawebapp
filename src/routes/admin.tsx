import { createFileRoute, Outlet, Link, useNavigate, useLocation, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useIsOwner } from "@/lib/queries";
import { ShieldCheck, LayoutDashboard, Users, Mail, ArrowLeft, Terminal, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/utenti", label: "Utenti", icon: Users },
  { to: "/admin/logs", label: "Logs", icon: ScrollText },
  { to: "/admin/log-email", label: "Email", icon: Mail },
  { to: "/admin/console", label: "Console", icon: Terminal },
];

function AdminLayout() {
  const { user, loading } = useAuth();
  const { data: isOwner, isLoading: roleLoading } = useIsOwner();
  const nav = useNavigate();
  const loc = useLocation();
  const isNavigating = useRouterState({ select: (s) => s.isLoading || s.isTransitioning });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!roleLoading && user && isOwner === false) nav({ to: "/home" });
  }, [roleLoading, isOwner, user, nav]);

  if (loading || roleLoading || !user || !isOwner) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Verifica accesso…</div>;
  }

  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur" style={{ top: "env(safe-area-inset-top)" }}>
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <h1 className="truncate text-sm font-semibold sm:text-base">Owner Console</h1>
          <Link to="/home" className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> App
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl snap-x snap-mandatory gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map((l) => {
            const active = l.exact ? loc.pathname === l.to : loc.pathname.startsWith(l.to);
            return (
              <Link key={l.to} to={l.to} className={cn(
                "inline-flex shrink-0 snap-start items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition active:scale-95",
                active ? "bg-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-secondary",
              )}>
                <l.icon className="h-3.5 w-3.5" /> {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="relative h-0.5 w-full overflow-hidden">
          <div className={cn(
            "absolute inset-y-0 left-0 bg-primary transition-all duration-300 ease-out",
            isNavigating ? "w-2/3 animate-pulse" : "w-0",
          )} />
        </div>
      </header>
      <main
        key={loc.pathname}
        className="mx-auto max-w-6xl animate-in fade-in-50 slide-in-from-bottom-1 px-3 py-4 duration-300 sm:px-4 sm:py-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        <Outlet />
      </main>
    </div>
  );
}
