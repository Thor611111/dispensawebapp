import * as React from "react";

type Theme = "light" | "dark" | "system";
type Ctx = { theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void };

const ThemeCtx = React.createContext<Ctx>({ theme: "system", resolved: "light", setTheme: () => {} });
const STORAGE_KEY = "pantryai-theme";

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return ((localStorage.getItem(STORAGE_KEY) as Theme) || "system");
  });
  const [resolved, setResolved] = React.useState<"light" | "dark">(() =>
    typeof window === "undefined" ? "light" : (theme === "system" ? getSystem() : theme)
  );

  React.useEffect(() => {
    const r = theme === "system" ? getSystem() : theme;
    setResolved(r);
    applyClass(r);
  }, [theme]);

  React.useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { const r = getSystem(); setResolved(r); applyClass(r); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = React.useCallback((t: Theme) => {
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  }, []);

  return <ThemeCtx.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => React.useContext(ThemeCtx);
