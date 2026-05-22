import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { ymd } from "@/lib/date";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useFoodItems, usePreferences, useSavedRecipes, useRecipeFeedback, useUpcomingMeals, useRecipeViews } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2, Clock, Wallet, ThumbsDown, ThumbsUp, Heart, Plus, Trash2, BookmarkPlus, SlidersHorizontal, Barcode, Receipt, AlertCircle, CheckCircle2, CalendarPlus, Search, X, Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getRecipeStatus } from "@/lib/recipe-status";
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
  const { data: views = [] } = useRecipeViews();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<R[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState("");
  const [maxCost, setMaxCost] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [planFor, setPlanFor] = useState<{ title: string; recipe_id?: string | null; ingredients?: any[] } | null>(null);
  const [planDate, setPlanDate] = useState<string>(() => ymd(new Date()));
  const [planSlot, setPlanSlot] = useState<string>("dinner");
  const [planSaving, setPlanSaving] = useState(false);
  // Esplora
  const [exploreQuery, setExploreQuery] = useState("");
  const [exploreIngInput, setExploreIngInput] = useState("");
  const [exploreIngs, setExploreIngs] = useState<string[]>([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [exploreRecipes, setExploreRecipes] = useState<R[]>([]);
  const QUICK_INGS = ["pasta", "riso", "pollo", "uova", "patate", "zucchine", "pomodoro", "tonno", "ceci", "spinaci"];

  const todayStr = ymd(new Date());
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = ymd(tomorrow);
  const { data: upcoming = [] } = useUpcomingMeals(hid, todayStr, tomorrowStr);
  const warningDays = Number(prefs?.expiry_warning_days ?? 3);

  if (location.pathname !== "/ricette") return <Outlet />;

  const likes = feedback.filter((f) => f.feedback === "liked").map((f) => f.recipe_title).filter(Boolean) as string[];
  const dislikes = feedback.filter((f) => f.feedback === "disliked").map((f) => f.recipe_title).filter(Boolean) as string[];
  // Titoli visti di recente: segnale di interesse per l'AI
  const viewedTitles = Array.from(new Set((views as any[]).map((v) => v.recipe_title).filter(Boolean))).slice(0, 20) as string[];
  // Ingredienti più frequenti nelle ricette salvate + viste (top 10)
  const frequentIngredients = (() => {
    const counts: Record<string, number> = {};
    for (const r of saved as any[]) for (const ing of (r.recipe_ingredients ?? [])) {
      const k = (ing.name ?? "").toLowerCase().trim();
      if (k) counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k]) => k);
  })();
  const myFeedback = (title: string) => feedback.find((f) => f.recipe_title === title && f.user_id === user?.id)?.feedback;

  const trackView = async (title: string, recipe_id?: string | null) => {
    if (!user || !title) return;
    await supabase.from("recipe_views").insert({ user_id: user.id, recipe_title: title, recipe_id: recipe_id ?? null });
    qc.invalidateQueries({ queryKey: ["recipe-views", user.id] });
  };

  const generate = async () => {
    setLoading(true);
    const filters: Record<string, unknown> = {};
    if (maxMinutes) filters.maxMinutes = Number(maxMinutes);
    if (maxCost) filters.maxCost = Number(maxCost);
    if (difficulty) filters.difficulty = difficulty;
    const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", { body: { foodItems: items, preferences: prefs, count: 5, likes, dislikes, viewedTitles, frequentIngredients, filters } });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    setRecipes(data.recipes ?? []);
  };

  const addExploreIng = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v) return;
    if (exploreIngs.includes(v)) return;
    setExploreIngs([...exploreIngs, v]);
    setExploreIngInput("");
  };

  const exploreSearch = async () => {
    if (!exploreQuery.trim() && exploreIngs.length === 0) {
      return toast.info("Inserisci un nome o un ingrediente");
    }
    setExploreLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", {
      body: {
        foodItems: items,
        preferences: prefs,
        count: 6,
        likes, dislikes,
        mode: "explore",
        query: exploreQuery.trim(),
        searchIngredients: exploreIngs,
      },
    });
    setExploreLoading(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    setExploreRecipes(data.recipes ?? []);
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

  const addMissingForUpcoming = async (entry: any) => {
    if (!hid) return;
    const ings = entry.recipes?.recipe_ingredients ?? [];
    if (!ings.length) return toast.info("Ricetta senza ingredienti collegati");
    const have = new Set(items.map((i: any) => i.name.toLowerCase()));
    const missing = ings.filter((ing: any) => !have.has(ing.name.toLowerCase()));
    if (!missing.length) return toast.success("Hai già tutto!");
    const { data: existing } = await supabase.from("shopping_list_items").select("name").eq("household_id", hid);
    const inList = new Set((existing ?? []).map((c: any) => c.name.toLowerCase()));
    const rows = missing
      .filter((m: any) => !inList.has(m.name.toLowerCase()))
      .map((m: any) => ({ household_id: hid, name: m.name, quantity: m.quantity ?? 1, unit: m.unit ?? "pz", source: "recipe" }));
    if (!rows.length) return toast.info("Mancanti già in lista");
    await supabase.from("shopping_list_items").insert(rows);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
    toast.success(`${rows.length} ingredienti aggiunti alla spesa`);
  };

  const ensurePlanForDate = async (dateStr: string): Promise<string> => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    d.setDate(d.getDate() - diff);
    const ws = ymd(d);
    const { data: existing } = await supabase.from("meal_plans").select("id").eq("household_id", hid!).eq("week_start", ws).maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase.from("meal_plans").insert({ household_id: hid!, week_start: ws }).select("id").single();
    if (error || !data) throw error ?? new Error("plan");
    return data.id;
  };

  const confirmPlan = async () => {
    if (!hid || !planFor) return;
    setPlanSaving(true);
    try {
      const planId = await ensurePlanForDate(planDate);
      const { error } = await supabase.from("meal_plan_entries").insert({
        meal_plan_id: planId,
        day_date: planDate,
        slot: planSlot as any,
        recipe_id: planFor.recipe_id ?? null,
        recipe_title_snapshot: planFor.title,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["plan-month", hid] });
      qc.invalidateQueries({ queryKey: ["upcoming-meals", hid] });
      toast.success("Aggiunto al piano");
      setPlanFor(null);
    } catch (e: any) {
      toast.error(e.message ?? "Errore");
    } finally {
      setPlanSaving(false);
    }
  };

  const upcomingByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const e of upcoming) (map[e.day_date] ||= []).push(e);
    return map;
  }, [upcoming]);
  const SLOT_LABEL: Record<string, string> = { breakfast: "Colazione", lunch: "Pranzo", dinner: "Cena", snack: "Spuntino" };

  return (
    <div>
      <PageHeader title="Cosa cucino?" subtitle="Ricette pensate per te." />

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/dispensa/aggiungi" search={{ scan: 1 } as any}><Barcode className="h-4 w-4" /> Scan codice</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/spesa" search={{ scan: 1 } as any}><Receipt className="h-4 w-4" /> Scan scontrino</Link>
        </Button>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="w-full">
          <TabsTrigger value="today" className="flex-1">Da cucinare</TabsTrigger>
          <TabsTrigger value="ai" className="flex-1">Suggerite</TabsTrigger>
          <TabsTrigger value="explore" className="flex-1">Esplora</TabsTrigger>
          <TabsTrigger value="saved" className="flex-1">Salvate ({saved.length})</TabsTrigger>
          <TabsTrigger value="mine" className="flex-1">Mie</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center space-y-2">
              <p className="text-muted-foreground text-sm">Nessun pasto pianificato per oggi o domani.</p>
              <Button asChild size="sm"><Link to="/piano">Vai al piano</Link></Button>
            </div>
          ) : (
            [todayStr, tomorrowStr].map((ds) => {
              const list = upcomingByDay[ds];
              if (!list?.length) return null;
              const d = new Date(ds);
              const lbl = ds === todayStr ? "Oggi" : "Domani";
              return (
                <div key={ds} className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{lbl} · {d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "short" })}</p>
                  {list.map((e: any) => {
                    const ings = e.recipes?.recipe_ingredients ?? [];
                    const status = ings.length ? getRecipeStatus(ings, items, warningDays) : null;
                    return (
                      <div key={e.id} className="rounded-2xl border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] uppercase text-muted-foreground">{SLOT_LABEL[e.slot] ?? e.slot}</p>
                            <p className="font-medium text-sm">{e.recipe_title_snapshot}</p>
                            {e.notes && <p className="mt-0.5 text-xs text-primary">💡 {e.notes}</p>}
                            {status?.hasIngredients && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                                {status.allInPantry ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5"><CheckCircle2 className="h-3 w-3" /> Hai tutto</span>
                                ) : (
                                  <button onClick={() => addMissingForUpcoming(e)} className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 hover:bg-amber-500/25"><AlertCircle className="h-3 w-3" /> Mancano {status.missing.length} → spesa</button>
                                )}
                                {status.expiringUsed.length > 0 && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 px-2 py-0.5"><Clock className="h-3 w-3" /> Usa {status.expiringUsed.length} in scadenza</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {e.recipes?.instructions && (
                          <details className="mt-2 text-sm">
                            <summary className="cursor-pointer text-muted-foreground text-xs">Vedi ricetta</summary>
                            <ul className="mt-2 space-y-0.5 text-xs">
                              {ings.map((ing: any) => (<li key={ing.id}>• {ing.quantity ?? ""}{ing.unit ?? ""} {ing.name}</li>))}
                            </ul>
                            <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground">{e.recipes.instructions}</p>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </TabsContent>

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
                  <details className="text-sm" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) trackView(r.title); }}>
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
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setPlanFor({ title: r.title, ingredients: r.ingredients })}>
                    <CalendarPlus className="h-4 w-4" /> Pianifica
                  </Button>
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
                    <details className="text-sm" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) trackView(r.title, r.id); }}>
                      <summary className="cursor-pointer text-muted-foreground">Ingredienti e preparazione</summary>
                      <ul className="mt-2 space-y-0.5">
                        {(r.recipe_ingredients ?? []).map((ing: any) => (<li key={ing.id}>• {ing.quantity ?? ""}{ing.unit ?? ""} {ing.name}</li>))}
                      </ul>
                      <p className="mt-2 whitespace-pre-line text-muted-foreground">{r.instructions}</p>
                    </details>
                  )}
                  <Button size="sm" variant="outline" className="w-full mt-3" onClick={() => setPlanFor({ title: r.title, recipe_id: r.id, ingredients: r.recipe_ingredients })}>
                    <CalendarPlus className="h-4 w-4" /> Aggiungi al piano
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="explore" className="space-y-3">
          <div className="rounded-2xl border bg-card p-3 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Cerca per nome (es. carbonara, tiramisù)"
                  value={exploreQuery}
                  onChange={(e) => setExploreQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") exploreSearch(); }}
                />
              </div>
              <Button size="sm" onClick={exploreSearch} disabled={exploreLoading}>
                {exploreLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
                Cerca
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Ingredienti da includere</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Aggiungi ingrediente"
                  value={exploreIngInput}
                  onChange={(e) => setExploreIngInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addExploreIng(exploreIngInput); } }}
                />
                <Button size="sm" variant="outline" onClick={() => addExploreIng(exploreIngInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {exploreIngs.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {exploreIngs.map((ing) => (
                    <button
                      key={ing}
                      onClick={() => setExploreIngs(exploreIngs.filter((x) => x !== ing))}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2.5 py-1 text-xs font-medium animate-scale-in hover:bg-primary/25 transition"
                    >
                      {ing}
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_INGS.filter((q) => !exploreIngs.includes(q)).map((q) => (
                  <button
                    key={q}
                    onClick={() => addExploreIng(q)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition"
                  >
                    <Plus className="h-3 w-3" /> {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {exploreLoading && (
            <ul className="space-y-3">
              {[0, 1, 2].map((i) => (
                <li key={i} className="rounded-2xl border bg-card p-4 animate-pulse">
                  <div className="h-4 w-2/3 bg-muted rounded mb-2" />
                  <div className="h-3 w-1/2 bg-muted rounded mb-3" />
                  <div className="flex gap-2"><div className="h-5 w-16 bg-muted rounded-full" /><div className="h-5 w-20 bg-muted rounded-full" /></div>
                </li>
              ))}
            </ul>
          )}

          {!exploreLoading && exploreRecipes.length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
              <Compass className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium">Esplora nuove ricette</p>
              <p className="text-xs text-muted-foreground">Cerca per nome o aggiungi ingredienti che vuoi usare. Le ricette non sono limitate alla tua dispensa.</p>
            </div>
          )}

          {!exploreLoading && exploreRecipes.length > 0 && (
            <ul className="space-y-3">
              {exploreRecipes.map((r, i) => {
                const have = new Set(items.map((it: any) => it.name.toLowerCase()));
                const missing = r.ingredients.filter((ing) => !have.has(ing.name.toLowerCase()));
                const ready = missing.length === 0;
                const fb = myFeedback(r.title);
                return (
                  <li key={i} className={`rounded-2xl border bg-card p-4 animate-fade-in ${ready ? "ring-2 ring-primary/40" : ""}`}>
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold leading-tight">{r.title}</h3>
                        {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant={fb === "liked" ? "default" : "ghost"} onClick={() => giveFeedback(r.title, "liked")}><ThumbsUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant={fb === "disliked" ? "default" : "ghost"} onClick={() => giveFeedback(r.title, "disliked")}><ThumbsDown className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5 text-xs">
                      {ready ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5"><CheckCircle2 className="h-3 w-3" /> Pronta da cucinare</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5"><AlertCircle className="h-3 w-3" /> Mancano {missing.length}</span>
                      )}
                      <Badge><Clock className="mr-1 h-3 w-3" />{r.prep_minutes} min</Badge>
                      <Badge variant="outline"><Wallet className="mr-1 h-3 w-3" />~{r.estimated_cost.toFixed(2)} €</Badge>
                      {r.difficulty && <Badge variant="outline">{r.difficulty}</Badge>}
                    </div>
                    <details className="text-sm" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) trackView(r.title); }}>
                      <summary className="cursor-pointer text-muted-foreground">Ingredienti e preparazione</summary>
                      <ul className="mt-2 space-y-0.5">
                        {r.ingredients.map((ing, j) => {
                          const isMissing = !have.has(ing.name.toLowerCase());
                          return (
                            <li key={j} className={isMissing ? "text-amber-700 dark:text-amber-300" : ""}>
                              • {ing.quantity ?? ""}{ing.unit ?? ""} {ing.name}{isMissing ? " (manca)" : ""}
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-2 whitespace-pre-line text-muted-foreground">{r.instructions}</p>
                    </details>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" onClick={() => saveRecipe(r)}><BookmarkPlus className="h-4 w-4" /> Salva</Button>
                      <Button size="sm" variant="outline" onClick={() => addToShopping(r)}>Mancanti → spesa</Button>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setPlanFor({ title: r.title, ingredients: r.ingredients })}>
                      <CalendarPlus className="h-4 w-4" /> Pianifica
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="saved-orig-placeholder" className="hidden">
        <TabsContent value="mine" className="space-y-3">
          <Button asChild className="w-full"><Link to="/ricette/nuova"><Plus className="h-4 w-4" /> Crea ricetta personalizzata</Link></Button>
          {saved.filter((r: any) => !r.created_by || r.created_by === user?.id).length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Le tue ricette appariranno qui.</p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!planFor} onOpenChange={(o) => !o && setPlanFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi al piano</DialogTitle>
            <DialogDescription>{planFor?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Giorno</Label>
              <Input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Pasto</Label>
              <Select value={planSlot} onValueChange={setPlanSlot}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Colazione</SelectItem>
                  <SelectItem value="lunch">Pranzo</SelectItem>
                  <SelectItem value="dinner">Cena</SelectItem>
                  <SelectItem value="snack">Spuntino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanFor(null)}>Annulla</Button>
            <Button onClick={confirmPlan} disabled={planSaving}>{planSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Aggiungi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}