import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useHouseholdId, useFoodItems, usePreferences } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Clock, Wallet, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ricette")({ component: Ricette });

type R = { title: string; description?: string; reason: string; prep_minutes: number; estimated_cost: number; difficulty?: string; servings?: number; ingredients: { name: string; quantity?: number; unit?: string }[]; instructions: string };

function Ricette() {
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useFoodItems(hid);
  const { data: prefs } = usePreferences(hid);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<R[]>([]);

  const generate = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", { body: { foodItems: items, preferences: prefs, count: 5 } });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    setRecipes(data.recipes ?? []);
  };

  const addToShopping = async (r: R) => {
    if (!hid) return;
    const have = new Set(items.map((i) => i.name.toLowerCase()));
    const missing = r.ingredients.filter((ing) => !have.has(ing.name.toLowerCase()));
    if (!missing.length) return toast.success("Hai già tutto!");
    const rows = missing.map((m) => ({ household_id: hid, name: m.name, quantity: m.quantity ?? 1, unit: m.unit ?? "pz", source: "recipe" }));
    const { error } = await supabase.from("shopping_list_items").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} ingredienti aggiunti alla spesa`);
  };

  return (
    <div>
      <PageHeader title="Cosa cucino?" subtitle="Ricette pensate per te." right={
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Suggerisci
        </Button>
      }/>

      {recipes.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <p className="text-muted-foreground">Tocca "Suggerisci" per ricevere ricette su misura, basate sulla tua dispensa.</p>
        </div>
      )}

      <ul className="space-y-3">
        {recipes.map((r, i) => (
          <li key={i} className="rounded-2xl border bg-card p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="font-semibold leading-tight">{r.title}</h3>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" title="Mi piace"><ThumbsUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" title="No grazie"><ThumbsDown className="h-4 w-4" /></Button>
              </div>
            </div>
            <p className="mb-2 text-sm text-primary">💡 {r.reason}</p>
            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{r.prep_minutes} min</Badge>
              <Badge variant="outline"><Wallet className="mr-1 h-3 w-3" />~{r.estimated_cost.toFixed(2)} €</Badge>
              {r.difficulty && <Badge variant="outline">{r.difficulty}</Badge>}
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Ingredienti e preparazione</summary>
              <ul className="mt-2 space-y-0.5">
                {r.ingredients.map((ing, j) => (
                  <li key={j}>• {ing.quantity ?? ""}{ing.unit ?? ""} {ing.name}</li>
                ))}
              </ul>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">{r.instructions}</p>
            </details>
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => addToShopping(r)}>Aggiungi mancanti alla spesa</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}