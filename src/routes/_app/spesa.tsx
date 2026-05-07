import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useShoppingList } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/spesa")({ component: Spesa });

function Spesa() {
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useShoppingList(hid);
  const qc = useQueryClient();
  const [name, setName] = useState("");

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

  return (
    <div>
      <PageHeader title="Lista spesa" subtitle={total > 0 ? `Stima rimanente: ~${total.toFixed(2)} €` : "Aggiungi cosa ti serve."} />
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