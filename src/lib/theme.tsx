import * as React from "react";

type Theme = "light" | "dark" | "system";

export type AccentId = "salvia" | "terracotta" | "oceano" | "lavanda" | "ambra" | "grafite";
export type FontId = "sistema" | "serif" | "moderno" | "rotondo";

export const ACCENTS: { id: AccentId; label: string; swatch: string; primary: string; primaryDark: string }[] = [
  { id: "salvia",     label: "Salvia",     swatch: "#7ea585", primary: "oklch(0.55 0.09 150)", primaryDark: "oklch(0.7 0.12 150)" },
  { id: "terracotta", label: "Terracotta", swatch: "#c4654a", primary: "oklch(0.65 0.17 40)",  primaryDark: "oklch(0.72 0.17 45)" },
  { id: "oceano",     label: "Oceano",     swatch: "#3b82c4", primary: "oklch(0.58 0.13 235)", primaryDark: "oklch(0.7 0.14 235)" },
  { id: "lavanda",    label: "Lavanda",    swatch: "#8b7ec8", primary: "oklch(0.6 0.13 295)",  primaryDark: "oklch(0.72 0.14 295)" },
  { id: "ambra",      label: "Ambra",      swatch: "#d4a24a", primary: "oklch(0.7 0.15 75)",   primaryDark: "oklch(0.78 0.16 75)" },
  { id: "grafite",    label: "Grafite",    swatch: "#4a5568", primary: "oklch(0.42 0.02 250)", primaryDark: "oklch(0.75 0.02 250)" },
];

export const FONTS: { id: FontId; label: string; body: string; display: string }[] = [
  { id: "sistema", label: "Sistema",   body: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', display: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { id: "moderno", label: "Moderno",   body: '"Inter", ui-sans-serif, system-ui, sans-serif', display: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: "serif",   label: "Editoriale", body: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif', display: '"Fraunces", ui-serif, Georgia, serif' },
  { id: "rotondo", label: "Rotondo",   body: '"Nunito", ui-sans-serif, system-ui, sans-serif', display: '"Nunito", ui-sans-serif, system-ui, sans-serif' },
];

type Ctx = {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
  accent: AccentId;
  setAccent: (a: AccentId) => void;
  font: FontId;
  setFont: (f: FontId) => void;
};

const ThemeCtx = React.createContext<Ctx>({
  theme: "system", resolved: "light", setTheme: () => {},
  accent: "salvia", setAccent: () => {},
  font: "sistema", setFont: () => {},
});
const STORAGE_KEY = "pantryai-theme";
const ACCENT_KEY = "pantryai-accent";
const FONT_KEY = "pantryai-font";

function getSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyClass(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function applyAccent(id: AccentId, resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0];
  const value = resolved === "dark" ? a.primaryDark : a.primary;
  const root = document.documentElement.style;
  root.setProperty("--primary", value);
  root.setProperty("--accent", value);
  root.setProperty("--ring", value);
}

function applyFont(id: FontId) {
  if (typeof document === "undefined") return;
  const f = FONTS.find((x) => x.id === id) ?? FONTS[0];
  const root = document.documentElement.style;
  root.setProperty("--font-body", f.body);
  root.setProperty("--font-display", f.display);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return ((localStorage.getItem(STORAGE_KEY) as Theme) || "system");
  });
  const [resolved, setResolved] = React.useState<"light" | "dark">(() =>
    typeof window === "undefined" ? "light" : (theme === "system" ? getSystem() : theme)
  );
  const [accent, setAccentState] = React.useState<AccentId>(() => {
    if (typeof window === "undefined") return "salvia";
    return ((localStorage.getItem(ACCENT_KEY) as AccentId) || "salvia");
  });
  const [font, setFontState] = React.useState<FontId>(() => {
    if (typeof window === "undefined") return "sistema";
    return ((localStorage.getItem(FONT_KEY) as FontId) || "sistema");
  });

  React.useEffect(() => {
    const r = theme === "system" ? getSystem() : theme;
    setResolved(r);
    applyClass(r);
    applyAccent(accent, r);
  }, [theme, accent]);

  React.useEffect(() => { applyFont(font); }, [font]);

  React.useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { const r = getSystem(); setResolved(r); applyClass(r); applyAccent(accent, r); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, accent]);

  const setTheme = React.useCallback((t: Theme) => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  const setAccent = React.useCallback((a: AccentId) => {
    if (typeof window !== "undefined") localStorage.setItem(ACCENT_KEY, a);
    setAccentState(a);
  }, []);

  const setFont = React.useCallback((f: FontId) => {
    if (typeof window !== "undefined") localStorage.setItem(FONT_KEY, f);
    setFontState(f);
  }, []);

  return <ThemeCtx.Provider value={{ theme, resolved, setTheme, accent, setAccent, font, setFont }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => React.useContext(ThemeCtx);
