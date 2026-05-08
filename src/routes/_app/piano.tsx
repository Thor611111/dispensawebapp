import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { useHouseholdId, useFoodItems, usePreferences } from "@/lib/queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronLeft, ChevronRight, ShoppingCart, Plus, Trash2, CalendarDays, CalendarRange, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/piano")({ component: Piano });

const SLOTS = [
  { v: "breakfast", l: "Colazione" },
  { v: "lunch", l: "Pranzo" },
  { v: "dinner", l: "Cena" },
  { v: "snack", l: "Spuntino" },
] as const;

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_IT = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function startOfMonth(year: number, month: number) { return new Date(year, month, 1); }
function endOfMonth(year: number, month: number) { return new Date(year, month + 1, 0); }

function Piano() {
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useFoodItems(hid);
  const { data: prefs } = usePreferences(hid);
  const qc = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genDialog, setGenDialog] = useState<null | "day" | "week" | "month">(null);
  const [genSlots, setGenSlots] = useState<Record<string, boolean>>({ breakfast: false, lunch: true, dinner: true, snack: false });
  const [genOverwrite, setGenOverwrite] = useState<"skip" | "overwrite">("skip");
  const [shoppingLoading, setShoppingLoading] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const monthStart = ymd(startOfMonth(year, month));
  const monthEnd = ymd(endOfMonth(year, month));

  const { data: entries = [] } = useQuery({
    queryKey: ["plan-month", hid, year, month],
    enabled: !!hid,
    queryFn: async () => {
      const { data: plans } = await supabase.from("meal_plans").select("id").eq("household_id", hid!);
      const ids = (plans ?? []).map((p) => p.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("meal_plan_entries").select("*").in("meal_plan_id", ids).gte("day_date", monthStart).lte("day_date", monthEnd);
      return data ?? [];
    },
  });

  const ensurePlan = async (weekStart: string): Promise<string> => {
    const { data: existing } = await supabase.from("meal_plans").select("id").eq("household_id", hid!).eq("week_start", weekStart).maybeSingle();
    if (existing) return existing.id;
    const { data, error } = await supabase.from("meal_plans").insert({ household_id: hid!, week_start: weekStart }).select("id").single();
    if (error || !data) throw error ?? new Error("plan");
    return data.id;
  };

  const weekStartOf = (d: Date) => {
    const x = new Date(d);
    const day = x.getDay();
    const diff = (day + 6) % 7;
    x.setDate(x.getDate() - diff);
    return ymd(x);
  };

  const computeRange = (mode: "day" | "week" | "month"): { start: Date; end: Date } => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    if (mode === "day") return { start: t, end: t };
    if (mode === "week") {
      const end = new Date(t); end.setDate(end.getDate() + 6);
      return { start: t, end };
    }
    const end = endOfMonth(t.getFullYear(), t.getMonth());
    return { start: t, end };
  };

  const runGenerate = async () => {
    if (!hid || !genDialog) return;
    const { start, end } = computeRange(genDialog);
    const activeSlots = (Object.keys(genSlots) as Array<keyof typeof genSlots>).filter((k) => genSlots[k]);
    if (!activeSlots.length) return toast.error("Seleziona almeno uno slot");

    // build full target list (date+slot), filtering already-planned days if "skip"
    const dayList: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) dayList.push(new Date(d));
    const dayNames = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    const slotLabel: Record<string, string> = { breakfast: "Colazione", lunch: "Pranzo", dinner: "Cena", snack: "Spuntino" };
    const targets: Array<{ date: string; slot: string; dayName: string; weekend: boolean }> = [];
    for (const d of dayList) {
      const ds = ymd(d);
      const dn = d.getDay();
      for (const s of activeSlots) {
        const exists = (entriesByDay[ds] ?? []).some((e: any) => e.slot === s);
        if (exists && genOverwrite === "skip") continue;
        targets.push({ date: ds, slot: s, dayName: dayNames[dn], weekend: dn === 0 || dn === 6 });
      }
    }
    if (!targets.length) { setGenDialog(null); return toast.info("Nessun slot da pianificare (tutti già presenti)"); }

    // recent titles to avoid repetition
    const sinceDate = new Date(); sinceDate.setDate(sinceDate.getDate() - 28);
    const { data: planRows } = await supabase.from("meal_plans").select("id").eq("household_id", hid);
    const planIds = (planRows ?? []).map((p) => p.id);
    let recentTitles: string[] = [];
    if (planIds.length) {
      const { data: rec } = await supabase.from("meal_plan_entries")
        .select("recipe_title_snapshot, day_date")
        .in("meal_plan_id", planIds)
        .gte("day_date", ymd(sinceDate));
      recentTitles = Array.from(new Set((rec ?? []).map((r: any) => r.recipe_title_snapshot).filter(Boolean))).slice(0, 40);
    }

    // dislikes from recipe_feedback
    const { data: fb } = await supabase.from("recipe_feedback").select("recipe_title, feedback");
    const dislikes = Array.from(new Set((fb ?? []).filter((f: any) => f.feedback === "dislike").map((f: any) => f.recipe_title).filter(Boolean)));
    const likes = Array.from(new Set((fb ?? []).filter((f: any) => f.feedback === "like").map((f: any) => f.recipe_title).filter(Boolean)));

    setGenDialog(null);
    setGenerating(true);
    setGenProgress(0);
    setGenTotal(targets.length);

    // batch into chunks of max 7 slots per AI call to keep responses small/fast
    const BATCH = 7;
    const allRecipes: any[] = [];
    try {
      for (let i = 0; i < targets.length; i += BATCH) {
        const chunk = targets.slice(i, i + BATCH);
        const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", {
          body: {
            foodItems: items,
            preferences: prefs,
            slotsPlan: chunk,
            recentTitles: [...recentTitles, ...allRecipes.map((r) => r.title)],
            likes,
            dislikes,
          },
        });
        if (error || data?.error) throw new Error(error?.message ?? data?.error ?? "Errore AI");
        const recipes = (data.recipes ?? []) as any[];
        // map to chunk order if assigned_to missing
        recipes.forEach((r, idx) => {
          const tgt = r.assigned_to && r.assigned_to.date ? r.assigned_to : chunk[idx];
          if (tgt) allRecipes.push({ ...r, _date: tgt.date, _slot: tgt.slot });
        });
        setGenProgress(Math.min(i + BATCH, targets.length));
      }

      // group by week and persist
      const rowsByWeek: Record<string, any[]> = {};
      for (const r of allRecipes) {
        const ws = weekStartOf(new Date(r._date));
        (rowsByWeek[ws] ||= []).push({
          day_date: r._date, slot: r._slot,
          recipe_title_snapshot: r.title, notes: r.reason,
        });
      }
      for (const ws of Object.keys(rowsByWeek)) {
        const planId = await ensurePlan(ws);
        if (genOverwrite === "overwrite") {
          const datesSlots = rowsByWeek[ws];
          for (const r of datesSlots) {
            await supabase.from("meal_plan_entries")
              .delete().eq("meal_plan_id", planId).eq("day_date", r.day_date).eq("slot", r.slot);
          }
        }
        await supabase.from("meal_plan_entries").insert(rowsByWeek[ws].map((r) => ({ ...r, meal_plan_id: planId })));
      }
      qc.invalidateQueries({ queryKey: ["plan-month", hid] });
      toast.success(`Pianificati ${allRecipes.length} pasti`);
    } catch (e: any) {
      toast.error(e.message ?? "Errore generazione");
    } finally {
      setGenerating(false);
      setGenProgress(0);
      setGenTotal(0);
    }
  };

  const addToShopping = async () => {
    if (!hid) return;
    setShoppingLoading(true);
    const meals = entries.map((e: any) => ({ title: e.recipe_title_snapshot, notes: e.notes }));
    const { data, error } = await supabase.functions.invoke("ai-plan-to-shopping", {
      body: { meals, pantry: items, preferences: prefs },
    });
    if (error || data?.error) { setShoppingLoading(false); return toast.error(error?.message ?? data?.error); }
    const missing = (data.items ?? []) as any[];
    // dedupe vs current shopping list
    const { data: current } = await supabase.from("shopping_list_items").select("name").eq("household_id", hid);
    const existingNames = new Set((current ?? []).map((c) => c.name.toLowerCase()));
    const toInsert = missing.filter((m) => !existingNames.has(m.name.toLowerCase())).map((m) => ({
      household_id: hid, name: m.name, quantity: m.quantity ?? 1, unit: m.unit ?? "pz",
      category: m.category ?? null, source: "plan",
    }));
    if (toInsert.length) await supabase.from("shopping_list_items").insert(toInsert);
    setShoppingLoading(false);
    toast.success(`${toInsert.length} articoli aggiunti alla spesa`);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
  };

  const entriesByDay: Record<string, any[]> = {};
  (entries as any[]).forEach((e) => { (entriesByDay[e.day_date] ||= []).push(e); });

  const firstDay = startOfMonth(year, month);
  const offset = (firstDay.getDay() + 6) % 7;
  const totalDays = endOfMonth(year, month).getDate();
  const cells: (Date | null)[] = Array(offset).fill(null).concat(
    Array.from({ length: totalDays }, (_, i) => new Date(year, month, i + 1))
  );

  const todayStr = ymd(today);
  const monthLabel = `${MONTHS_IT[month]} ${year}`;
  const fullToday = today.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const prevMonth = () => { const d = new Date(year, month - 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); };
  const nextMonth = () => { const d = new Date(year, month + 1, 1); setYear(d.getFullYear()); setMonth(d.getMonth()); };

  return (
    <div>
      <PageHeader title="Piano pasti" subtitle={fullToday.charAt(0).toUpperCase() + fullToday.slice(1)} right={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addToShopping} disabled={shoppingLoading || entries.length === 0}>
            {shoppingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Genera
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setGenDialog("day")}><CalendarIcon className="h-4 w-4 mr-2" />Giorno (oggi)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGenDialog("week")}><CalendarDays className="h-4 w-4 mr-2" />Settimana (7 gg)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGenDialog("month")}><CalendarRange className="h-4 w-4 mr-2" />Resto del mese</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      } />

      {generating && genTotal > 0 && (
        <div className="mb-3 rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Generazione in corso…</span>
            <span>{genProgress}/{genTotal}</span>
          </div>
          <Progress value={(genProgress / genTotal) * 100} />
        </div>
      )}

      <Dialog open={!!genDialog} onOpenChange={(o) => !o && setGenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Genera piano — {genDialog === "day" ? "Giorno" : genDialog === "week" ? "Settimana" : "Resto del mese"}</DialogTitle>
            <DialogDescription>
              {genDialog && (() => {
                const { start, end } = computeRange(genDialog);
                const fmt = (d: Date) => d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
                return start.getTime() === end.getTime() ? `${fmt(start)}` : `Dal ${fmt(start)} al ${fmt(end)}`;
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Pasti</p>
              <div className="grid grid-cols-2 gap-2">
                {SLOTS.map((s) => (
                  <label key={s.v} className="flex items-center gap-2 rounded-lg border p-2 cursor-pointer">
                    <Checkbox checked={genSlots[s.v]} onCheckedChange={(v) => setGenSlots((p) => ({ ...p, [s.v]: !!v }))} />
                    <span className="text-sm">{s.l}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Se un pasto esiste già</p>
              <RadioGroup value={genOverwrite} onValueChange={(v) => setGenOverwrite(v as any)}>
                <div className="flex items-center gap-2"><RadioGroupItem value="skip" id="r-skip" /><Label htmlFor="r-skip">Salta (mantieni esistenti)</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="overwrite" id="r-over" /><Label htmlFor="r-over">Sovrascrivi</Label></div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenDialog(null)}>Annulla</Button>
            <Button onClick={runGenerate}><Sparkles className="h-4 w-4 mr-1" />Genera</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="mb-3 flex items-center justify-between rounded-xl border bg-card p-2">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <p className="text-sm font-semibold capitalize">{monthLabel}</p>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground mb-1">
        {DAYS_IT.map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = ymd(d);
          const has = (entriesByDay[ds] ?? []).length;
          const isToday = ds === todayStr;
          return (
            <button key={i} onClick={() => setOpenDay(ds)} className={`aspect-square rounded-lg border text-xs p-1 flex flex-col items-center justify-center ${isToday ? "border-primary bg-primary/10" : "bg-card"} hover:bg-secondary/50`}>
              <span className="font-semibold">{d.getDate()}</span>
              {has > 0 && <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
              {has > 0 && <span className="text-[9px] text-muted-foreground">{has}</span>}
            </button>
          );
        })}
      </div>

      <DayDrawer hid={hid} day={openDay} onClose={() => setOpenDay(null)} entriesByDay={entriesByDay} ensurePlan={ensurePlan} weekStartOf={weekStartOf} />
    </div>
  );
}

function DayDrawer({ hid, day, onClose, entriesByDay, ensurePlan, weekStartOf }: any) {
  const qc = useQueryClient();
  const [slot, setSlot] = useState("lunch");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  if (!day) return null;
  const entries = entriesByDay[day] ?? [];
  const d = new Date(day);
  const label = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  const add = async () => {
    if (!hid || !title.trim()) return;
    const ws = weekStartOf(d);
    const planId = await ensurePlan(ws);
    const { error } = await supabase.from("meal_plan_entries").insert({ meal_plan_id: planId, day_date: day, slot: slot as any, recipe_title_snapshot: title.trim(), notes: notes.trim() || null });
    if (error) return toast.error(error.message);
    setTitle(""); setNotes("");
    qc.invalidateQueries({ queryKey: ["plan-month", hid] });
    toast.success("Pasto aggiunto");
  };

  const remove = async (id: string) => {
    await supabase.from("meal_plan_entries").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["plan-month", hid] });
  };

  return (
    <Drawer open={!!day} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent>
        <DrawerHeader><DrawerTitle className="capitalize">{label}</DrawerTitle></DrawerHeader>
        <div className="px-4 space-y-3 max-h-[50vh] overflow-y-auto">
          {entries.length === 0 ? <p className="text-sm text-muted-foreground">Nessun pasto pianificato.</p> : entries.map((e: any) => (
            <div key={e.id} className="flex items-start gap-2 rounded-lg border bg-card p-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase text-muted-foreground">{SLOTS.find((s) => s.v === e.slot)?.l ?? e.slot}</p>
                <p className="text-sm font-medium">{e.recipe_title_snapshot}</p>
                {e.notes && <p className="mt-0.5 text-xs text-primary">💡 {e.notes}</p>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
            </div>
          ))}

          <div className="rounded-lg border bg-card p-3 space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Aggiungi pasto</p>
            <div className="flex gap-2">
              {SLOTS.map((s) => (
                <Button key={s.v} size="sm" variant={slot === s.v ? "default" : "outline"} onClick={() => setSlot(s.v)} className="flex-1 text-xs">{s.l}</Button>
              ))}
            </div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome ricetta" />
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (opzionale)" rows={2} />
            <Button onClick={add} className="w-full"><Plus className="h-4 w-4" /> Aggiungi</Button>
          </div>
        </div>
        <DrawerFooter><Button variant="outline" onClick={onClose}>Chiudi</Button></DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}