import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { useHouseholdId, useFoodItems, usePreferences } from "@/lib/queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ChevronLeft, ChevronRight, ShoppingCart, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

  const generateMonth = async () => {
    if (!hid) return;
    setGenerating(true);
    const days = endOfMonth(year, month).getDate();
    const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", {
      body: { foodItems: items, preferences: prefs, count: days * 2 },
    });
    if (error || data?.error) { setGenerating(false); return toast.error(error?.message ?? data?.error); }
    const recipes = data.recipes ?? [];
    // group by week_start, ensure plans, insert entries
    const rowsByWeek: Record<string, any[]> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(year, month, i + 1);
      const ws = weekStartOf(d);
      const lunch = recipes[i * 2];
      const dinner = recipes[i * 2 + 1];
      const list = rowsByWeek[ws] ||= [];
      if (lunch) list.push({ day_date: ymd(d), slot: "lunch", recipe_title_snapshot: lunch.title, notes: lunch.reason });
      if (dinner) list.push({ day_date: ymd(d), slot: "dinner", recipe_title_snapshot: dinner.title, notes: dinner.reason });
    }
    for (const ws of Object.keys(rowsByWeek)) {
      const planId = await ensurePlan(ws);
      // delete existing entries for these days
      const dates = rowsByWeek[ws].map((r) => r.day_date);
      await supabase.from("meal_plan_entries").delete().eq("meal_plan_id", planId).in("day_date", dates);
      await supabase.from("meal_plan_entries").insert(rowsByWeek[ws].map((r) => ({ ...r, meal_plan_id: planId })));
    }
    setGenerating(false);
    qc.invalidateQueries({ queryKey: ["plan-month", hid] });
    toast.success("Mese pianificato!");
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
          <Button size="sm" onClick={generateMonth} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Genera mese
          </Button>
        </div>
      } />

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