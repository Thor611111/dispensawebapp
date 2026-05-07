import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useFoodItems, daysUntil } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Refrigerator, Snowflake, Package2, Box } from "lucide-react";
import { toast } from "sonner";

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
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  if (location.pathname !== "/dispensa") return <Outlet />;

  const filtered = filter === "all" ? items : items.filter((i) => i.location === filter);

  const remove = async (id: string) => {
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["food", hid] });
  };

  return (
    <div>
      <PageHeader
        title="Dispensa"
        subtitle="Cosa hai in casa, sempre aggiornato."
        right={
          <Button asChild size="sm">
            <Link to="/dispensa/aggiungi"><Plus className="h-4 w-4" /> Aggiungi</Link>
          </Button>
        }
      />

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
                    {it.price ? ` · ${it.price.toFixed(2)} €` : ""}
                    {it.category ? ` · ${it.category}` : ""}
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
    </div>
  );
}