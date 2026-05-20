import { createFileRoute, Link } from "@tanstack/react-router";
import { ymd } from "@/lib/date";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { useHouseholdId, useFoodItems, usePreferences, useProfile, useIsAdmin, useMemberKind, daysUntil } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Clock, Wallet, AlertTriangle, ShieldCheck, Plus, Camera, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { InstallAppCard } from "@/components/InstallAppCard";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/home")({ component: Home });

type R = { title: string; reason: string; prep_minutes: number; estimated_cost: number };

function Home() {
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useFoodItems(hid);
  const { data: prefs } = usePreferences(hid);
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { data: kind } = useMemberKind(hid);
  const isChild = kind === "child";
  useQueryClient();
  const [quick, setQuick] = useState<R[]>([]);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const warnDays = (prefs as any)?.expiry_warning_days ?? 3;
  const expiring = items.filter((i) => { const d = daysUntil(i.expires_on); return d !== null && d <= warnDays; }).length;

  const monthLabel = today.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const loadQuick = async (force = false) => {
    if (!items.length) return;
    const cacheKey = `quick-${hid}-${ymd(new Date())}`;
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setQuick(JSON.parse(cached)); return; }
      // already loaded today in memory? skip extra fetch
      if (quick.length) return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", { body: { foodItems: items, preferences: prefs, count: 2 } });
    setLoading(false);
    if (error || data?.error) return toast.error(error?.message ?? data?.error);
    const r = (data.recipes ?? []).slice(0, 2);
    setQuick(r);
    localStorage.setItem(cacheKey, JSON.stringify(r));
  };

  // Carica una sola volta al primo avere hid+items: la cache giornaliera evita chiamate ripetute.
  useEffect(() => { if (hid && items.length && !quick.length) loadQuick(); /* eslint-disable-next-line */ }, [hid, items.length > 0]);

  const firstName = (profile?.display_name ?? "").trim().split(/\s+/)[0];
  const greeting = firstName ? `Ciao, ${firstName} 👋` : "Ciao 👋";

  return (
    <div>
      <PageHeader title={greeting} subtitle={monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} />

      <InstallAppCard variant="banner" dismissible />

      {/* Flusso guidato: 4 step rapidi */}
      <div className="mb-4 rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <p className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">Cosa fare ora</p>
        <ol className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">1</span> Aggiungi alimenti</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">2</span> Vedi ricette suggerite</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">3</span> Scegli cosa cucinare</li>
          <li className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">4</span> Aggiungi al piano pasti</li>
        </ol>
      </div>

      <Link to="/dispensa" search={{ filter: "expiring" }} className="mb-4 block rounded-2xl border bg-card p-4 transition-colors hover:bg-secondary/40">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">In scadenza ≤{warnDays}g</p>
            <p className={`mt-1 text-2xl font-bold ${expiring > 0 ? "text-danger" : ""}`}>{expiring}</p>
          </div>
          <AlertTriangle className={`h-8 w-8 ${expiring > 0 ? "text-danger" : "text-muted-foreground/40"}`} />
        </div>
      </Link>

      {!isChild && (
        <div className="mb-5 grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-auto justify-start gap-2 py-3">
            <Link to="/dispensa/aggiungi"><Plus className="h-4 w-4" /> Aggiungi alimento</Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start gap-2 py-3">
            <Link to="/spesa" search={{ scan: 1 }}><Camera className="h-4 w-4" /> Scansiona scontrino</Link>
          </Button>
        </div>
      )}

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

      {isAdmin && (
        <Link to="/admin" className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-sm hover:bg-primary/10 transition">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="font-medium">Admin Dashboard</p>
            <p className="text-xs text-muted-foreground">Apri pannello di gestione</p>
          </div>
        </Link>
      )}
    </div>
  );
}