import { createFileRoute } from "@tanstack/react-router";
import { SettingsPageHeader } from "@/components/SettingsPage";
import { useTheme, ACCENTS, FONTS } from "@/lib/theme";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/impostazioni/aspetto")({ component: Page });

function Page() {
  const { theme, setTheme, accent, setAccent, font, setFont } = useTheme();
  const modes = [
    { v: "light" as const, l: "Chiaro", Icon: Sun },
    { v: "dark" as const, l: "Scuro", Icon: Moon },
    { v: "system" as const, l: "Sistema", Icon: Monitor },
  ];
  return (
    <div>
      <SettingsPageHeader title="Aspetto" subtitle="Scegli tema, colore e font" />
      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Tema</h2>
          <div className="grid grid-cols-3 gap-2">
            {modes.map(({ v, l, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setTheme(v)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition",
                  theme === v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-secondary/40 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {l}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Colore accent</h2>
          <div className="grid grid-cols-3 gap-2">
            {ACCENTS.map((a) => {
              const active = accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccent(a.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition",
                    active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40",
                  )}
                >
                  <span
                    className="relative flex h-9 w-9 items-center justify-center rounded-full shadow-soft"
                    style={{ backgroundColor: a.swatch }}
                  >
                    {active && <Check className="h-4 w-4 text-white" />}
                  </span>
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Font</h2>
          <div className="grid grid-cols-2 gap-2">
            {FONTS.map((f) => {
              const active = font === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                    active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/40",
                  )}
                >
                  <span className="text-lg font-semibold leading-tight" style={{ fontFamily: f.display }}>
                    Aa — {f.label}
                  </span>
                  <span className="text-xs text-muted-foreground" style={{ fontFamily: f.body }}>
                    La mia dispensa
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}