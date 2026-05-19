import { createFileRoute } from "@tanstack/react-router";
import { ymd } from "@/lib/date";
import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/AppShell";
import { useHouseholdId, useExpenses, usePreferences, useFoodItems, usePantries, currentWeekStart } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { Wallet, TrendingUp, TrendingDown, Download, BarChart3, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/_app/statistiche")({ component: Statistiche });

type PeriodKey = "week" | "month" | "quarter";

function startOfPeriod(p: PeriodKey): { from: string; days: number; label: string; prevFrom: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (p === "week") {
    const from = new Date(currentWeekStart());
    const prev = new Date(from); prev.setDate(prev.getDate() - 7);
    return { from: ymd(from), days: 7, label: "Questa settimana", prevFrom: ymd(prev) };
  }
  if (p === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return { from: ymd(from), days, label: "Questo mese", prevFrom: ymd(prev) };
  }
  const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const prev = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  return { from: ymd(from), days: 90, label: "Ultimi 3 mesi", prevFrom: ymd(prev) };
}

const COLORS = ["var(--color-primary)", "var(--color-accent)", "var(--color-warning)", "var(--color-success)", "var(--color-danger)", "var(--color-muted-foreground)"];

function Statistiche() {
  const { data: hid } = useHouseholdId();
  const { data: expenses = [] } = useExpenses(hid);
  const { data: prefs } = usePreferences(hid);
  const { data: foods = [] } = useFoodItems(hid);
  const { data: pantries = [] } = usePantries(hid);
  const qc = useQueryClient();

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [weeklyBudget, setWeeklyBudget] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  useEffect(() => {
    setWeeklyBudget(prefs?.weekly_budget ? String(prefs.weekly_budget) : "");
    setMonthlyBudget(prefs?.monthly_budget ? String(prefs.monthly_budget) : "");
  }, [prefs?.weekly_budget, prefs?.monthly_budget]);

  const ctx = useMemo(() => startOfPeriod(period), [period]);

  const inPeriod = useMemo(() => expenses.filter((e) => e.spent_on >= ctx.from), [expenses, ctx.from]);
  const inPrev = useMemo(() => expenses.filter((e) => e.spent_on >= ctx.prevFrom && e.spent_on < ctx.from), [expenses, ctx.prevFrom, ctx.from]);

  const totalSpent = inPeriod.reduce((s, e) => s + Number(e.amount), 0);
  const prevTotal = inPrev.reduce((s, e) => s + Number(e.amount), 0);
  const delta = prevTotal > 0 ? ((totalSpent - prevTotal) / prevTotal) * 100 : null;

  const budget = period === "week"
    ? Number(prefs?.weekly_budget ?? 0)
    : period === "month"
      ? Number(prefs?.monthly_budget ?? 0)
      : Number(prefs?.monthly_budget ?? 0) * 3;

  const today = new Date();
  const dayOfPeriod = period === "week"
    ? Math.min(7, Math.floor((today.getTime() - new Date(ctx.from).getTime()) / 86400000) + 1)
    : Math.min(ctx.days, today.getDate());
  const forecast = dayOfPeriod > 0 ? (totalSpent / dayOfPeriod) * ctx.days : 0;

  // Cumulative chart
  const cumulative = useMemo(() => {
    const days: { date: string; cumulative: number; budget: number }[] = [];
    const byDay: Record<string, number> = {};
    for (const e of inPeriod) byDay[e.spent_on] = (byDay[e.spent_on] || 0) + Number(e.amount);
    let acc = 0;
    const fromDate = new Date(ctx.from);
    for (let i = 0; i < ctx.days; i++) {
      const d = new Date(fromDate); d.setDate(d.getDate() + i);
      const ds = ymd(d);
      if (d > today) {
        days.push({ date: ds.slice(5), cumulative: NaN, budget: budget > 0 ? budget * ((i + 1) / ctx.days) : 0 });
      } else {
        acc += byDay[ds] || 0;
        days.push({ date: ds.slice(5), cumulative: Number(acc.toFixed(2)), budget: budget > 0 ? Number((budget * ((i + 1) / ctx.days)).toFixed(2)) : 0 });
      }
    }
    return days;
  }, [inPeriod, ctx, budget]);

  // Top categorie: prova a derivare dal foodItem comprato nello stesso periodo
  const categoryAgg = useMemo(() => {
    const byCat: Record<string, number> = {};
    for (const f of foods) {
      if (!f.price) continue;
      const created = (f.created_at ?? "").slice(0, 10);
      if (created < ctx.from) continue;
      const cat = f.category || "Altro";
      byCat[cat] = (byCat[cat] || 0) + Number(f.price);
    }
    const entries = Object.entries(byCat).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
    entries.sort((a, b) => b.value - a.value);
    return entries.slice(0, 8);
  }, [foods, ctx.from]);

  // Spesa per dispensa
  const pantryAgg = useMemo(() => {
    const byP: Record<string, number> = {};
    for (const f of foods) {
      if (!f.price) continue;
      const created = (f.created_at ?? "").slice(0, 10);
      if (created < ctx.from) continue;
      const pid = f.pantry_id ?? "default";
      byP[pid] = (byP[pid] || 0) + Number(f.price);
    }
    return Object.entries(byP).map(([pid, value]) => ({
      name: pantries.find((p) => p.id === pid)?.name ?? "Senza dispensa",
      value: Number(value.toFixed(2)),
    }));
  }, [foods, pantries, ctx.from]);

  const exportCsv = () => {
    if (!inPeriod.length) return toast.error("Nessuna spesa da esportare");
    const header = "data,importo,nota\n";
    const rows = inPeriod.map((e) => `${e.spent_on},${Number(e.amount).toFixed(2)},${(e.note ?? "").replace(/[,\n]/g, " ")}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spese_${ctx.from}_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveBudget = async () => {
    if (!hid) return;
    setSavingBudget(true);
    const { error } = await supabase.from("user_preferences").upsert({
      household_id: hid,
      weekly_budget: weeklyBudget ? Number(weeklyBudget) : null,
      monthly_budget: monthlyBudget ? Number(monthlyBudget) : null,
    });
    setSavingBudget(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["prefs", hid] });
    toast.success("Budget aggiornato");
  };

  const overBudget = budget > 0 && forecast > budget;
  const remaining = budget - totalSpent;

  return (
    <div>
      <PageHeader title="Statistiche" subtitle="Andamento spese, budget e previsioni." />

      <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodKey)} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="week" className="flex-1">Settimana</TabsTrigger>
          <TabsTrigger value="month" className="flex-1">Mese</TabsTrigger>
          <TabsTrigger value="quarter" className="flex-1">3 mesi</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Speso</p>
          <p className="mt-1 text-2xl font-bold">{totalSpent.toFixed(2)} €</p>
          {delta !== null && (
            <p className={`mt-1 inline-flex items-center gap-1 text-xs ${delta > 0 ? "text-danger" : "text-success"}`}>
              {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta).toFixed(0)}% vs precedente
            </p>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Budget {ctx.label.toLowerCase()}</p>
          <p className="mt-1 text-2xl font-bold">{budget > 0 ? `${budget.toFixed(2)} €` : "—"}</p>
          {budget > 0 && (
            <p className={`mt-1 text-xs ${remaining < 0 ? "text-danger" : "text-muted-foreground"}`}>
              {remaining >= 0 ? `Restano ${remaining.toFixed(2)} €` : `Sforato di ${Math.abs(remaining).toFixed(2)} €`}
            </p>
          )}
        </div>
      </div>

      {budget > 0 && (
        <div className={`mb-4 rounded-2xl border p-4 text-sm ${overBudget ? "border-danger/40 bg-danger/5 text-danger" : "border-success/30 bg-success/5 text-success-foreground"}`}>
          <p className="font-medium text-foreground">
            Forecast: {forecast.toFixed(2)} €
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {overBudget
              ? `Al ritmo attuale supererai il budget di ${(forecast - budget).toFixed(2)} €`
              : `Al ritmo attuale chiuderai sotto budget di ${(budget - forecast).toFixed(2)} €`}
          </p>
        </div>
      )}

      <div className="mb-4 rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Spesa cumulativa</h3>
          <Button size="sm" variant="ghost" onClick={exportCsv}><Download className="h-3 w-3" /> CSV</Button>
        </div>
        {inPeriod.length === 0 ? (
          <EmptyState icon={BarChart3} title="Nessuna spesa nel periodo" description="Le spese registrate appariranno qui." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumulative} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              {budget > 0 && <Area type="monotone" dataKey="budget" stroke="var(--color-muted-foreground)" strokeDasharray="4 4" fill="none" />}
              <Area type="monotone" dataKey="cumulative" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {categoryAgg.length > 0 && (
        <div className="mb-4 rounded-2xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Top categorie</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, categoryAgg.length * 28)}>
            <BarChart data={categoryAgg} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {pantryAgg.length > 1 && (
        <div className="mb-4 rounded-2xl border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Per dispensa</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pantryAgg} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(d: any) => `${d.name}: ${d.value}€`}>
                {pantryAgg.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mb-4 rounded-2xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Imposta budget</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Settimanale (€)</Label>
            <Input type="number" min={0} step="0.01" value={weeklyBudget} onChange={(e) => setWeeklyBudget(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mensile (€)</Label>
            <Input type="number" min={0} step="0.01" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} />
          </div>
        </div>
        <Button size="sm" className="mt-3 w-full" onClick={saveBudget} disabled={savingBudget}>
          {savingBudget ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salva budget
        </Button>
      </div>
    </div>
  );
}