import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { useHouseholdId, useFoodItems, usePreferences, currentWeekStart } from "@/lib/queries";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/piano")({ component: Piano });

const DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function Piano() {
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useFoodItems(hid);
  const { data: prefs } = usePreferences(hid);
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const weekStart = currentWeekStart();

  const { data: plan } = useQuery({
    queryKey: ["plan", hid, weekStart],
    enabled: !!hid,
    queryFn: async () => {
      const { data } = await supabase
        .from("meal_plans")
        .select("*, meal_plan_entries(*)")
        .eq("household_id", hid!)
        .eq("week_start", weekStart)
        .maybeSingle();
      return data;
    },
  });

  const generate = async () => {
    if (!hid) return;
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("ai-suggest-recipes", {
      body: { foodItems: items, preferences: prefs, count: 14 },
    });
    if (error || data?.error) {
      setGenerating(false);
      return toast.error(error?.message ?? data.error);
    }
    const recipes = data.recipes ?? [];
    const totalCost = recipes.reduce((s: number, r: any) => s + (r.estimated_cost ?? 0), 0);

    // Delete existing plan for this week
    await supabase.from("meal_plans").delete().eq("household_id", hid).eq("week_start", weekStart);

    const { data: newPlan, error: e1 } = await supabase
      .from("meal_plans")
      .insert({ household_id: hid, week_start: weekStart, total_estimated_cost: totalCost, reasoning: `Piano generato usando ${items.length} alimenti già in dispensa.` })
      .select("id")
      .single();
    if (e1 || !newPlan) {
      setGenerating(false);
      return toast.error(e1?.message ?? "Errore");
    }

    const entries: any[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      const dayStr = day.toISOString().slice(0, 10);
      const lunch = recipes[d * 2];
      const dinner = recipes[d * 2 + 1];
      if (lunch) entries.push({ meal_plan_id: newPlan.id, day_date: dayStr, slot: "lunch", recipe_title_snapshot: lunch.title, notes: lunch.reason });
      if (dinner) entries.push({ meal_plan_id: newPlan.id, day_date: dayStr, slot: "dinner", recipe_title_snapshot: dinner.title, notes: dinner.reason });
    }
    if (entries.length) await supabase.from("meal_plan_entries").insert(entries);

    setGenerating(false);
    qc.invalidateQueries({ queryKey: ["plan", hid, weekStart] });
    toast.success("Piano della settimana pronto!");
  };

  const entriesByDay: Record<string, any[]> = {};
  (plan?.meal_plan_entries ?? []).forEach((e: any) => {
    (entriesByDay[e.day_date] ||= []).push(e);
  });

  return (
    <div>
      <PageHeader title="Piano settimanale" subtitle={plan ? `Settimana del ${weekStart}` : "Genera il menu della settimana in un tap."} right={
        <Button size="sm" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {plan ? "Rigenera" : "Genera"}
        </Button>
      } />

      {plan?.reasoning && <p className="mb-4 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">💡 {plan.reasoning}{plan.total_estimated_cost ? ` Costo stimato: ~${Number(plan.total_estimated_cost).toFixed(2)} €` : ""}</p>}

      <div className="space-y-3">
        {DAYS.map((d, i) => {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + i);
          const dayStr = day.toISOString().slice(0, 10);
          const entries = entriesByDay[dayStr] ?? [];
          return (
            <div key={d} className="rounded-xl border bg-card p-4">
              <p className="mb-2 text-sm font-semibold">{d} {day.getDate()}</p>
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun pasto.</p>
              ) : entries.map((e) => (
                <div key={e.id} className="border-t py-2 first:border-0 first:pt-0">
                  <p className="text-xs uppercase text-muted-foreground">{e.slot === "lunch" ? "Pranzo" : e.slot === "dinner" ? "Cena" : e.slot}</p>
                  <p className="text-sm font-medium">{e.recipe_title_snapshot}</p>
                  {e.notes && <p className="mt-0.5 text-xs text-primary">💡 {e.notes}</p>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}