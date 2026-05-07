import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useHouseholdId, useFoodItems, usePreferences, useExpenses, currentWeekStart, daysUntil } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Clock, Wallet, Package, ChefHat, ShoppingCart, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/home")({ component: Home });

type R = { title: string; reason: string; prep_minutes: number; estimated_cost: number };

function Home() {
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useFoodItems(hid);
  const { data: prefs } = usePreferences(hid);
  const { data: expenses = [] } = useExpenses(hid);
  const [quick, setQuick] = useState<R[]>([]);
  const [loading, setLoading] = useState(false);

  const weekStart = currentWeekStart();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const weekSpent = expenses.filter((e) => e.spent_on >= weekStart).reduce((s, e) => s + Number(e.amount), 0);
  const monthSpent = expenses.filter((e) => e.spent_on >= monthStart).reduce((s, e) => s + Number(e.amount), 0);
  const budget = prefs?.weekly_budget ? Number(prefs.weekly_budget) : 0;
  const remaining = budget - weekSpent;
  const pct = budget > 0 ? Math.min(100, (weekSpent / budget) * 100) : 0;
  const mBudget = prefs?.monthly_budget ? Number(prefs.monthly_budget) : 0;
  const mPct = mBudget > 0 ? Math.min(100, (monthSpent / mBudget) * 100) : 0;
  const expiring = items.filter((i) => { const d = daysUntil(i.expires_on); return d !== null && d <= 3; }).length;

  const monthLabel = today.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const loadQuick = async (force = false) => {
    if (!items.length) return;
    const cacheKey = `quick-${hid}-${new Date().toISOString().slice(0, 10)}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setQuick(JSON.parse(cached)); return; }
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", { body: { foodItems: items, preferences: prefs, count: 2 } });
    setLoading(false);
    if (error || data?.error) return toast.error(error?.message ?? data?.error);
    const r = (data.recipes ?? []).slice(0, 2);
    setQuick(r);
    localStorage.setItem(cacheKey, JSON.stringify(r));
  };

  useEffect(() => { if (hid && items.length) loadQuick(); /* eslint-disable-next-line */ }, [hid, items.length]);

  return (
    <div>
      <PageHeader title="Ciao 👋" subtitle={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} />

      <div className="mb-4 rounded-2xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Budget settimanale</p>
            <p className={`mt-1 text-3xl font-bold ${remaining < 0 ? "text-destructive" : ""}`}>{budget > 0 ? `${remaining.toFixed(2)} €` : "—"}</p>
            <p className="text-xs text-muted-foreground">{budget > 0 ? `Speso ${weekSpent.toFixed(2)} di ${budget.toFixed(2)} €` : "Imposta un budget dal Profilo"}</p>
          </div>
          <Wallet className="h-10 w-10 text-primary" />
        </div>
        {budget > 0 && <Progress value={pct} className="mt-3" />}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Spesa del mese</p>
          <p className="mt-1 text-2xl font-bold">{monthSpent.toFixed(2)} €</p>
          {mBudget > 0 && (
            <>
              <Progress value={mPct} className="mt-2" />
              <p className="mt-1 text-[10px] text-muted-foreground">di {mBudget.toFixed(0)} €</p>
            </>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">In scadenza ≤3g</p>
          <p className={`mt-1 text-2xl font-bold ${expiring > 0 ? "text-destructive" : ""}`}>{expiring}</p>
        </div>
      </div>

      {expiring > 0 && (
        <Link to="/dispensa" className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> Hai {expiring} alimenti che scadono presto
        </Link>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Link to="/dispensa" className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-xs"><Package className="h-5 w-5 text-primary" /> Dispensa</Link>
        <Link to="/ricette" className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-xs"><ChefHat className="h-5 w-5 text-primary" /> Ricette</Link>
        <Link to="/spesa" className="flex flex-col items-center gap-1 rounded-xl border bg-card p-3 text-xs"><ShoppingCart className="h-5 w-5 text-primary" /> Spesa</Link>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Ricette rapide per te</h2>
        <Button size="sm" variant="ghost" onClick={() => loadQuick(true)} disabled={loading || !items.length}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Aggiorna
        </Button>
      </div>
      {!items.length ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">Aggiungi alimenti in dispensa per ricevere suggerimenti.</p>
      ) : quick.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{loading ? "Genero…" : "Nessun suggerimento."}</p>
      ) : (
        <ul className="space-y-2">
          {quick.map((r, i) => (
            <li key={i} className="rounded-xl border bg-card p-4">
              <p className="font-medium">{r.title}</p>
              <p className="mt-1 text-xs text-primary">💡 {r.reason}</p>
              <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{r.prep_minutes} min</span>
                <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />~{Number(r.estimated_cost).toFixed(2)} €</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}