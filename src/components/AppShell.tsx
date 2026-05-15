import { Link, useLocation } from "@tanstack/react-router";
import { Home, Package, Calendar, ShoppingCart, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/dispensa", label: "Dispensa", icon: Package },
  { to: "/piano", label: "Piano", icon: Calendar },
  { to: "/spesa", label: "Spesa", icon: ShoppingCart },
  { to: "/statistiche", label: "Stats", icon: BarChart3 },
  { to: "/impostazioni", label: "Impostazioni", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 py-1.5">
          {tabs.map((t) => {
            const active = loc.pathname === t.to || loc.pathname.startsWith(`${t.to}/`);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-border/40 pb-4">
      <div>
        <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right}
    </div>
  );
}