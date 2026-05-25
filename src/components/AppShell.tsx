import { Link, useLocation } from "@tanstack/react-router";
import { Home, Package, Calendar, ShoppingCart, ChefHat, Settings as SettingsIcon, Sun, Moon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme";

const tabs = [
  { to: "/home", label: "Home", icon: Home, emoji: "🏠" },
  { to: "/dispensa", label: "Dispensa", icon: Package, emoji: "🥫" },
  { to: "/ricette", label: "Ricette", icon: ChefHat, emoji: "🍳" },
  { to: "/piano", label: "Piano", icon: Calendar, emoji: "📅" },
  { to: "/spesa", label: "Spesa", icon: ShoppingCart, emoji: "🛒" },
  { to: "/impostazioni", label: "Impostazioni", icon: SettingsIcon, emoji: "⚙️" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background pb-28">
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      <nav className="fixed bottom-3 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-xl">
        <div className="rounded-3xl border border-border/60 bg-card/85 px-2 py-2 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
          <div className="flex items-stretch justify-around gap-0.5">
            {tabs.map((t) => {
              const active = loc.pathname === t.to || loc.pathname.startsWith(`${t.to}/`);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "group relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-medium transition-all duration-300",
                    active
                      ? "bg-gradient-warm text-primary-foreground shadow-pop scale-[1.06]"
                      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground active:scale-95",
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-transform duration-300", active && "-translate-y-0.5")} />
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

const ROUTE_EMOJI: Record<string, string> = {
  "/home": "👋",
  "/dispensa": "🥫",
  "/ricette": "🍳",
  "/piano": "📅",
  "/spesa": "🛒",
  "/impostazioni": "⚙️",
};

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const { resolved, setTheme } = useTheme();
  const loc = useLocation();
  const base = "/" + (loc.pathname.split("/")[1] ?? "");
  const emoji = ROUTE_EMOJI[base];
  return (
    <div className="mb-5 flex items-end justify-between gap-3 pb-3">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-bold leading-[1.05] tracking-tight">
          {emoji && <span className="mr-1.5 align-middle" aria-hidden>{emoji}</span>}
          {title}
        </h1>
        {subtitle ? <p className="mt-1.5 text-[13px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {right}
        <button
          type="button"
          aria-label={resolved === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground hover:scale-110 active:scale-95"
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