import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/lib/queries";
import { ShieldCheck, LayoutDashboard, Users, Mail, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/utenti", label: "Utenti", icon: Users },
  { to: "/admin/log-email", label: "Log email", icon: Mail },
];

function AdminLayout() {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!roleLoading && user && isAdmin === false) nav({ to: "/home" });
  }, [roleLoading, isAdmin, user, nav]);

  if (loading || roleLoading || !user || !isAdmin) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Verifica accesso…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">Admin Dashboard</h1>
          <Link to="/home" className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> App
          </Link>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-2">
          {links.map((l) => {
            const active = l.exact ? loc.pathname === l.to : loc.pathname.startsWith(l.to);
            return (
              <Link key={l.to} to={l.to} className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
              )}>
                <l.icon className="h-3.5 w-3.5" /> {l.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>
    </div>
  );
}