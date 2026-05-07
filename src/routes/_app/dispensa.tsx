import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useFoodItems, usePantries, daysUntil } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Refrigerator, Snowflake, Package2, Box, Trash } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/dispensa")({ component: Dispensa });

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
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [activePantry, setActivePantry] = useState<string>("all");
  const [newPantryName, setNewPantryName] = useState("");
  const [openPantryDialog, setOpenPantryDialog] = useState(false);

  if (location.pathname !== "/dispensa") return <Outlet />;

  const byPantry = activePantry === "all" ? items : items.filter((i) => (i.pantry_id ?? "default") === activePantry);
  const filtered = filter === "all" ? byPantry : byPantry.filter((i) => i.location === filter);
  const totalKcal = filtered.reduce((s, i) => s + (Number(i.kcal_per_unit ?? 0) * Number(i.quantity ?? 0)), 0);

  const remove = async (id: string) => {
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["food", hid] });
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
                    {it.quantity} {it.unit}
                    {it.price ? ` · ${Number(it.price).toFixed(2)} €` : ""}
                    {it.category ? ` · ${it.category}` : ""}
                    {it.kcal_per_unit ? ` · ~${Math.round(Number(it.kcal_per_unit) * Number(it.quantity))} kcal` : ""}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => remove(it.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

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