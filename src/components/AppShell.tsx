import { Link, useLocation } from "@tanstack/react-router";
import { Home, Package, Calendar, ShoppingCart, ChefHat, Settings as SettingsIcon, Sun, Moon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/dispensa", label: "Dispensa", icon: Package },
  { to: "/ricette", label: "Ricette", icon: ChefHat },
  { to: "/piano", label: "Piano", icon: Calendar },
  { to: "/spesa", label: "Spesa", icon: ShoppingCart },
  { to: "/impostazioni", label: "Impostazioni", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      <nav
        className="fixed left-1/2 z-40 -translate-x-1/2"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 14px)" }}
        aria-label="Navigazione principale"
      >
        <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-card/85 px-1.5 py-1.5 shadow-pop backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
          {tabs.map((t) => {
            const active = loc.pathname === t.to || loc.pathname.startsWith(`${t.to}/`);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-11 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-all duration-300 ease-out active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground shadow-pop"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-[18px] w-[18px] transition-transform", active && "scale-110")} />
                <span className={cn("overflow-hidden whitespace-nowrap transition-all", active ? "max-w-[100px] opacity-100" : "max-w-0 opacity-0")}>
                  {t.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { resolved, setTheme } = useTheme();
  return (
    <div className="mb-6 flex items-end justify-between gap-3 pt-1 pb-2 animate-fade-in">
      <div className="min-w-0">
        {subtitle ? <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground/80">{subtitle}</p> : null}
        <h1 className="font-display text-[28px] font-semibold leading-[1.1] tracking-tight">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {right}
        <button
          type="button"
          aria-label={resolved === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-soft transition-all hover:text-foreground active:scale-90"
        >
          {resolved === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </div>
  );
}

export function FullPageLoader({ label = "Caricamento…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}