import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useFoodItems, usePreferences, useSavedRecipes, useRecipeFeedback } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, Clock, Wallet, ThumbsDown, ThumbsUp, Heart, Plus, Trash2, BookmarkPlus, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ricette")({ component: Ricette });

type R = { title: string; description?: string; reason: string; prep_minutes: number; estimated_cost: number; difficulty?: string; servings?: number; ingredients: { name: string; quantity?: number; unit?: string }[]; instructions: string };

function Ricette() {
  const location = useLocation();
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useFoodItems(hid);
  const { data: prefs } = usePreferences(hid);
  const { data: saved = [] } = useSavedRecipes(hid);
  const { data: feedback = [] } = useRecipeFeedback();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<R[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [difficulty, setDifficulty] = useState("");

  if (location.pathname !== "/ricette") return <Outlet />;

  const likes = feedback.filter((f) => f.feedback === "liked").map((f) => f.recipe_title).filter(Boolean) as string[];
  const dislikes = feedback.filter((f) => f.feedback === "disliked").map((f) => f.recipe_title).filter(Boolean) as string[];
  const myFeedback = (title: string) => feedback.find((f) => f.recipe_title === title && f.user_id === user?.id)?.feedback;

  const generate = async () => {
    setLoading(true);
    const filters: Record<string, unknown> = {};
    if (maxMinutes) filters.maxMinutes = Number(maxMinutes);
    if (maxCost) filters.maxCost = Number(maxCost);
    if (difficulty) filters.difficulty = difficulty;
    const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", { body: { foodItems: items, preferences: prefs, count: 5, likes, dislikes, filters } });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    setRecipes(data.recipes ?? []);
  };

  const giveFeedback = async (title: string, fb: "liked" | "disliked") => {
    if (!user) return;
    const existing = feedback.find((f) => f.recipe_title === title && f.user_id === user.id);
    if (existing && existing.feedback === fb) {
      await supabase.from("recipe_feedback").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("recipe_feedback").update({ feedback: fb }).eq("id", existing.id);
    } else {
      await supabase.from("recipe_feedback").insert({ recipe_title: title, feedback: fb, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["recipe-feedback"] });
  };

  const saveRecipe = async (r: R) => {
    if (!hid) return;
    const { data: rec, error } = await supabase.from("recipes").insert({
      household_id: hid,
      title: r.title,
      description: r.description ?? null,
      instructions: r.instructions,
      prep_minutes: r.prep_minutes,
      estimated_cost: r.estimated_cost,
      difficulty: r.difficulty ?? null,
      servings: r.servings ?? 2,
    }).select("id").single();
    if (error || !rec) return toast.error(error?.message ?? "Errore");
    if (r.ingredients?.length) {
      await supabase.from("recipe_ingredients").insert(r.ingredients.map((i) => ({ recipe_id: rec.id, name: i.name, quantity: i.quantity ?? null, unit: i.unit ?? null })));
    }
    qc.invalidateQueries({ queryKey: ["recipes", hid] });
    toast.success("Ricetta salvata");
  };

  const removeSaved = async (id: string) => {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["recipes", hid] });
  };

  const toggleFav = async (id: string, v: boolean) => {
    await supabase.from("recipes").update({ is_favorite: !v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["recipes", hid] });
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
      <PageHeader title="Cosa cucino?" subtitle="Ricette pensate per te." />

      <Tabs defaultValue="ai">
        <TabsList className="w-full">
          <TabsTrigger value="ai" className="flex-1">Suggerite</TabsTrigger>
          <TabsTrigger value="saved" className="flex-1">Salvate ({saved.length})</TabsTrigger>
          <TabsTrigger value="mine" className="flex-1">Mie</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-3">
          <div className="flex gap-2">
            <Button size="sm" onClick={generate} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Suggerisci ricette
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowFilters((v) => !v)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-3 gap-2 rounded-xl border bg-card p-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max min</label>
                <Input type="number" value={maxMinutes} onChange={(e) => setMaxMinutes(e.target.value)} placeholder="30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max € </label>
                <Input type="number" step="0.5" value={maxCost} onChange={(e) => setMaxCost(e.target.value)} placeholder="8" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Difficoltà</label>
                <Select value={difficulty || "any"} onValueChange={(v) => setDifficulty(v === "any" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualsiasi</SelectItem>
                    <SelectItem value="facile">Facile</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="difficile">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {recipes.length === 0 && !loading && (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="text-muted-foreground">Tocca "Suggerisci" per ricevere ricette su misura.</p>
            </div>
          )}
          <ul className="space-y-3">
            {recipes.map((r, i) => {
              const fb = myFeedback(r.title);
              return (
                <li key={i} className="rounded-2xl border bg-card p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-tight">{r.title}</h3>
                    <div className="flex gap-1">
                      <Button size="icon" variant={fb === "liked" ? "default" : "ghost"} onClick={() => giveFeedback(r.title, "liked")} title="Mi piace"><ThumbsUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant={fb === "disliked" ? "default" : "ghost"} onClick={() => giveFeedback(r.title, "disliked")} title="No grazie"><ThumbsDown className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-primary">💡 {r.reason}</p>
                  <div className="mb-3 flex flex-wrap gap-2 text-xs">
                    <Badge><Clock className="mr-1 h-3 w-3" />{r.prep_minutes} min</Badge>
                    <Badge variant="outline"><Wallet className="mr-1 h-3 w-3" />~{r.estimated_cost.toFixed(2)} €</Badge>
                    {r.difficulty && <Badge variant="outline">{r.difficulty}</Badge>}
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground">Ingredienti e preparazione</summary>
                    <ul className="mt-2 space-y-0.5">
                      {r.ingredients.map((ing, j) => (<li key={j}>• {ing.quantity ?? ""}{ing.unit ?? ""} {ing.name}</li>))}
                    </ul>
                    <p className="mt-2 whitespace-pre-line text-muted-foreground">{r.instructions}</p>
                  </details>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" onClick={() => saveRecipe(r)}><BookmarkPlus className="h-4 w-4" /> Salva</Button>
                    <Button size="sm" variant="outline" onClick={() => addToShopping(r)}>Mancanti → spesa</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent value="saved" className="space-y-3">
          {saved.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Nessuna ricetta salvata.</div>
          ) : (
            <ul className="space-y-3">
              {saved.map((r: any) => (
                <li key={r.id} className="rounded-2xl border bg-card p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-tight">{r.title}</h3>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => toggleFav(r.id, r.is_favorite)}><Heart className={`h-4 w-4 ${r.is_favorite ? "fill-primary text-primary" : ""}`} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => removeSaved(r.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                    </div>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    {r.prep_minutes && <Badge><Clock className="mr-1 h-3 w-3" />{r.prep_minutes} min</Badge>}
                    {r.estimated_cost && <Badge variant="outline"><Wallet className="mr-1 h-3 w-3" />~{Number(r.estimated_cost).toFixed(2)} €</Badge>}
                    {r.difficulty && <Badge variant="outline">{r.difficulty}</Badge>}
                  </div>
                  {r.instructions && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">Ingredienti e preparazione</summary>
                      <ul className="mt-2 space-y-0.5">
                        {(r.recipe_ingredients ?? []).map((ing: any) => (<li key={ing.id}>• {ing.quantity ?? ""}{ing.unit ?? ""} {ing.name}</li>))}
                      </ul>
                      <p className="mt-2 whitespace-pre-line text-muted-foreground">{r.instructions}</p>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="mine" className="space-y-3">
          <Button asChild className="w-full"><Link to="/ricette/nuova"><Plus className="h-4 w-4" /> Crea ricetta personalizzata</Link></Button>
          {saved.filter((r: any) => !r.created_by || r.created_by === user?.id).length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Le tue ricette appariranno qui.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}