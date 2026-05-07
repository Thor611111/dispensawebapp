import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useShoppingList, useExpenses, usePreferences, useFoodItems, useRecommendedProducts, currentWeekStart } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, ShoppingBag, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/spesa")({ component: Spesa });

function Spesa() {
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useShoppingList(hid);
  const { data: expenses = [] } = useExpenses(hid);
  const { data: prefs } = usePreferences(hid);
  const { data: foods = [] } = useFoodItems(hid);
  const { data: recs = [] } = useRecommendedProducts(hid);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [genLoading, setGenLoading] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hid || !name.trim()) return;
    await supabase.from("shopping_list_items").insert({ household_id: hid, name });
    setName("");
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("shopping_list_items").update({ checked: v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
  };

  const remove = async (id: string) => {
    await supabase.from("shopping_list_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
  };

  const purchase = async () => {
    if (!hid) return;
    const checked = items.filter((i) => i.checked);
    if (!checked.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const total = checked.reduce((s, i) => s + Number(i.estimated_price ?? 0), 0);
    await supabase.from("food_items").insert(
      checked.map((c) => ({ household_id: hid, name: c.name, quantity: c.quantity, unit: c.unit, location: "pantry" as const, price: c.estimated_price })),
    );
    if (total > 0) await supabase.from("expenses").insert({ household_id: hid, amount: total, spent_on: today, note: "Spesa" });
    await supabase.from("shopping_list_items").delete().in("id", checked.map((c) => c.id));
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
    qc.invalidateQueries({ queryKey: ["food", hid] });
    toast.success(`${checked.length} articoli aggiunti alla dispensa`);
  };

  const total = items.filter((i) => !i.checked).reduce((s, i) => s + Number(i.estimated_price ?? 0), 0);
  const checkedCount = items.filter((i) => i.checked).length;

  const weekStart = currentWeekStart();
  const weekSpent = expenses.filter((e) => e.spent_on >= weekStart).reduce((s, e) => s + Number(e.amount), 0);
  const budget = prefs?.weekly_budget ? Number(prefs.weekly_budget) : 0;
  const remaining = budget - weekSpent;
  const pct = budget > 0 ? Math.min(100, (weekSpent / budget) * 100) : 0;

  const generateRecs = async () => {
    if (!hid) return;
    setGenLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-suggest-products", { body: { foodItems: foods, preferences: prefs, expenses } });
    if (error || data?.error) { setGenLoading(false); return toast.error(error?.message ?? data?.error); }
    await supabase.from("recommended_products").delete().eq("household_id", hid);
    const rows = (data.products ?? []).map((p: any) => ({ household_id: hid, name: p.name, category: p.category ?? null, reason: p.reason ?? null }));
    if (rows.length) await supabase.from("recommended_products").insert(rows);
    setGenLoading(false);
    qc.invalidateQueries({ queryKey: ["recommended", hid] });
  };

  const addRecToList = async (rec: any) => {
    if (!hid) return;
    await supabase.from("shopping_list_items").insert({ household_id: hid, name: rec.name, source: "ai" });
    await supabase.from("recommended_products").delete().eq("id", rec.id);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
    qc.invalidateQueries({ queryKey: ["recommended", hid] });
  };

  return (
    <div>
      <PageHeader title="Lista spesa" subtitle={total > 0 ? `Stima rimanente: ~${total.toFixed(2)} €` : "Aggiungi cosa ti serve."} />

      {budget > 0 && (
        <div className="mb-4 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Settimana</span>
            <span className={`font-semibold ${remaining < 0 ? "text-destructive" : "text-primary"}`}>{remaining.toFixed(2)} € rimanenti</span>
          </div>
          <Progress value={pct} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">Speso {weekSpent.toFixed(2)} di {budget.toFixed(2)} €</p>
        </div>
      )}

      <div className="mb-4 rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Consigliati per te</h3>
          <Button size="sm" variant="ghost" onClick={generateRecs} disabled={genLoading}>
            {genLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {recs.length ? "Aggiorna" : "Genera"}
          </Button>
        </div>
        {recs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tocca "Genera" per ricevere suggerimenti dall'AI.</p>
        ) : (
          <ul className="space-y-1.5">
            {recs.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg bg-secondary/40 p-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  {r.reason && <p className="truncate text-xs text-muted-foreground">{r.reason}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => addRecToList(r)}><Plus className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aggiungi articolo…" />
        <Button type="submit" size="icon"><Plus className="h-4 w-4" /></Button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Lista vuota.</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <Checkbox checked={it.checked} onCheckedChange={(v) => toggle(it.id, !!v)} />
              <div className="flex-1 min-w-0">
                <p className={`truncate text-sm ${it.checked ? "text-muted-foreground line-through" : ""}`}>{it.name}</p>
                <p className="text-xs text-muted-foreground">{it.quantity} {it.unit}{it.estimated_price ? ` · ${Number(it.estimated_price).toFixed(2)} €` : ""}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
            </li>
          ))}
        </ul>
      )}

      {checkedCount > 0 && (
        <Button className="mt-4 w-full" onClick={purchase}><ShoppingBag className="h-4 w-4" /> Spesa fatta ({checkedCount})</Button>
      )}
    </div>
  );
}