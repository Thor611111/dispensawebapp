import { createFileRoute, Link, Outlet, useLocation, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useFoodItems, usePantries, usePreferences, daysUntil } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Refrigerator, Snowflake, Package2, Box, Trash, AlertTriangle, RotateCcw, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QuantityStepper } from "@/components/QuantityStepper";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/dispensa")({
  component: Dispensa,
  validateSearch: (s: Record<string, unknown>) => ({ filter: typeof s.filter === "string" ? s.filter : undefined }),
});

const LOCS = [
  { v: "all", l: "Tutto", icon: Box },
  { v: "fridge", l: "Frigo", icon: Refrigerator },
  { v: "freezer", l: "Freezer", icon: Snowflake },
  { v: "pantry", l: "Dispensa", icon: Package2 },
] as const;

function Dispensa() {
  const location = useLocation();
  const { data: hid } = useHouseholdId();
  const { data: items = [], isLoading } = useFoodItems(hid);
  const { data: pantries = [] } = usePantries(hid);
  const { data: prefs } = usePreferences(hid);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [activePantry, setActivePantry] = useState<string>("all");
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [newPantryName, setNewPantryName] = useState("");
  const [openPantryDialog, setOpenPantryDialog] = useState(false);
  const search = useSearch({ from: "/_app/dispensa" });
  const [stornoItem, setStornoItem] = useState<any>(null);
  const [recalcId, setRecalcId] = useState<string | null>(null);

  useEffect(() => {
    if (search.filter === "expiring") setExpiringOnly(true);
  }, [search.filter]);

  if (location.pathname !== "/dispensa") return <Outlet />;

  const warnDays = (prefs as any)?.expiry_warning_days ?? 3;

  const byPantry = activePantry === "all" ? items : items.filter((i) => (i.pantry_id ?? "default") === activePantry);
  let filtered = filter === "all" ? byPantry : byPantry.filter((i) => i.location === filter);
  if (expiringOnly) filtered = filtered.filter((i) => { const d = daysUntil(i.expires_on); return d !== null && d <= warnDays; })
    .sort((a, b) => (daysUntil(a.expires_on) ?? 0) - (daysUntil(b.expires_on) ?? 0));
  const totalKcal = filtered.reduce((s, i) => s + (Number(i.kcal_per_unit ?? 0) * Number(i.quantity ?? 0)), 0);

  const remove = async (id: string) => {
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["food", hid] });
  };

  const updateQty = async (id: string, quantity: number) => {
    if (quantity <= 0) return remove(id);
    const { error } = await supabase.from("food_items").update({ quantity }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["food", hid] });
  };

  const refund = async () => {
    if (!hid || !stornoItem) return;
    const it = stornoItem;
    const today = new Date().toISOString().slice(0, 10);
    const amt = it.price ? Number(it.price) : 0;
    if (amt > 0) {
      const { error } = await supabase.from("expenses").insert({ household_id: hid, amount: -amt, spent_on: today, note: `Storno: ${it.name}` });
      if (error) { setStornoItem(null); return toast.error(error.message); }
    }
    await supabase.from("food_items").delete().eq("id", it.id);
    setStornoItem(null);
    qc.invalidateQueries({ queryKey: ["food", hid] });
    qc.invalidateQueries({ queryKey: ["expenses", hid] });
    toast.success(amt > 0 ? `Stornato ${amt.toFixed(2)} \u20ac` : "Alimento rimosso");
  };

  const recalcKcal = async (it: any) => {
    setRecalcId(it.id);
    const { data, error } = await supabase.functions.invoke("ai-calc-kcal", { body: { name: it.name, quantity: 1, unit: it.unit ?? "pz" } });
    setRecalcId(null);
    if (error || data?.error) return toast.error(error?.message ?? data?.error ?? "Errore AI");
    const k = Number(data?.kcal);
    if (!Number.isFinite(k)) return toast.error("Stima non disponibile");
    const { error: e2 } = await supabase.from("food_items").update({ kcal_per_unit: k }).eq("id", it.id);
    if (e2) return toast.error(e2.message);
    qc.invalidateQueries({ queryKey: ["food", hid] });
    toast.success(`Aggiornato: ${k} kcal/${it.unit ?? "pz"}`);
  };

  const empty = async () => {
    if (!hid) return;
    let q = supabase.from("food_items").delete().eq("household_id", hid);
    if (activePantry !== "all") q = q.eq("pantry_id", activePantry);
    const { error } = await q;
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["food", hid] });
    toast.success("Dispensa svuotata");
  };

  const createPantry = async () => {
    if (!hid || !newPantryName.trim()) return;
    const { error } = await supabase.from("pantries").insert({ household_id: hid, name: newPantryName.trim() });
    if (error) return toast.error(error.message);
    setNewPantryName("");
    setOpenPantryDialog(false);
    qc.invalidateQueries({ queryKey: ["pantries", hid] });
    toast.success("Dispensa creata");
  };

  return (
    <div>
      <PageHeader
        title="Dispensa"
        subtitle={totalKcal > 0 ? `${filtered.length} alimenti · ~${Math.round(totalKcal)} kcal totali` : "Cosa hai in casa, sempre aggiornato."}
        right={
          <Button asChild size="sm">
            <Link to="/dispensa/aggiungi"><Plus className="h-4 w-4" /> Aggiungi</Link>
          </Button>
        }
      />

      <div className="mb-3 flex gap-2">
        <Button size="sm" variant={!expiringOnly ? "default" : "outline"} onClick={() => setExpiringOnly(false)}>Tutto</Button>
        <Button size="sm" variant={expiringOnly ? "destructive" : "outline"} onClick={() => setExpiringOnly(true)}>
          <AlertTriangle className="h-4 w-4" /> In scadenza ({items.filter((i) => { const d = daysUntil(i.expires_on); return d !== null && d <= warnDays; }).length})
        </Button>
      </div>

      {pantries.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          <Button size="sm" variant={activePantry === "all" ? "default" : "outline"} onClick={() => setActivePantry("all")}>Tutte</Button>
          {pantries.map((p) => (
            <Button key={p.id} size="sm" variant={activePantry === p.id ? "default" : "outline"} onClick={() => setActivePantry(p.id)}>{p.name}</Button>
          ))}
          <Dialog open={openPantryDialog} onOpenChange={setOpenPantryDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost"><Plus className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nuova dispensa</DialogTitle></DialogHeader>
              <Input value={newPantryName} onChange={(e) => setNewPantryName(e.target.value)} placeholder="es. Ufficio, Casa al mare…" />
              <DialogFooter><Button onClick={createPantry}>Crea</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {LOCS.map((l) => (
          <Button key={l.v} size="sm" variant={filter === l.v ? "default" : "outline"} onClick={() => setFilter(l.v)}>
            <l.icon className="h-4 w-4" /> {l.l}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-muted-foreground">Caricamento…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">La dispensa è vuota.</p>
          <Button asChild className="mt-4">
            <Link to="/dispensa/aggiungi">Aggiungi il primo alimento</Link>
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => {
            const d = daysUntil(it.expires_on);
            let badgeVar: "default" | "secondary" | "destructive" = "secondary";
            let badgeText = "";
            if (d !== null) {
              if (d < 0) { badgeVar = "destructive"; badgeText = "Scaduto"; }
              else if (d === 0) { badgeVar = "destructive"; badgeText = "Oggi"; }
              else if (d <= 3) { badgeVar = "destructive"; badgeText = `${d}g`; }
              else if (d <= 7) { badgeVar = "default"; badgeText = `${d}g`; }
              else { badgeText = `${d}g`; }
            }
            return (
              <li key={it.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{it.name}</p>
                    {badgeText && <Badge variant={badgeVar} className="text-xs">{badgeText}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {it.price ? `${Number(it.price).toFixed(2)} €` : ""}
                    {it.category ? ` · ${it.category}` : ""}
                    {it.kcal_per_unit ? ` · ~${Math.round(Number(it.kcal_per_unit) * Number(it.quantity))} kcal` : ""}
                  </p>
                  <div className="mt-1.5">
                    <QuantityStepper value={Number(it.quantity ?? 0)} unit={it.unit} onChange={(n) => updateQty(it.id, n)} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => recalcKcal(it)} disabled={recalcId === it.id} title="Ricalcola kcal">
                    {recalcId === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flame className="h-3.5 w-3.5 text-amber-500" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStornoItem(it)} title="Storna acquisto">
                    <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(it.id)} title="Elimina">
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AlertDialog open={!!stornoItem} onOpenChange={(o) => !o && setStornoItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stornare "{stornoItem?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {stornoItem?.price ? `Verr\u00e0 rimosso dalla dispensa e accreditati ${Number(stornoItem.price).toFixed(2)} \u20ac sul saldo settimanale.` : "Verr\u00e0 rimosso dalla dispensa. Nessun importo da rimborsare (prezzo non registrato)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={refund}>Storna</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {filtered.length > 0 && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="mt-6 w-full"><Trash className="h-4 w-4" /> Svuota dispensa{activePantry !== "all" ? " selezionata" : ""}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Svuotare la dispensa?</AlertDialogTitle>
              <AlertDialogDescription>Verranno eliminati {filtered.length} alimenti. Azione irreversibile.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={empty}>Svuota</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}