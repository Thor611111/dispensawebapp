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
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto max-w-2xl px-2 py-1.5">
          <div className="flex items-stretch justify-around gap-0.5">
            {tabs.map((t) => {
              const active = loc.pathname === t.to || loc.pathname.startsWith(`${t.to}/`);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="leading-none">{t.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { resolved, setTheme } = useTheme();
  return (
    <div className="mb-5 flex items-end justify-between gap-3 pb-2">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {right}
        <button
          type="button"
          aria-label={resolved === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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