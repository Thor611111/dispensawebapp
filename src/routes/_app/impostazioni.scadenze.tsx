import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHouseholdId, usePreferences } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SettingsPageHeader } from "@/components/SettingsPage";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/impostazioni/scadenze")({ component: Page });

function Page() {
  const { data: hid } = useHouseholdId();
  const { data: prefs } = usePreferences(hid);
  const qc = useQueryClient();
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");

  useEffect(() => {
    if (prefs) {
      setDays((prefs as any).expiry_warning_days ?? 3);
      setBudget(prefs.weekly_budget ? String(prefs.weekly_budget) : "");
      setMonthlyBudget(prefs.monthly_budget ? String(prefs.monthly_budget) : "");
    }
  }, [prefs]);

  const save = async () => {
    if (!hid) return;
    const { error } = await supabase.from("user_preferences").upsert({
      household_id: hid,
      expiry_warning_days: days,
      weekly_budget: budget ? Number(budget) : null,
      monthly_budget: monthlyBudget ? Number(monthlyBudget) : null,
    } as any);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["prefs", hid] });
    toast.success("Salvato");
  };

  return (
    <div>
      <SettingsPageHeader title="Scadenze e budget" />
      <div className="space-y-6">
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <Label>Avvisami quando scade tra</Label>
            <span className="text-2xl font-bold text-primary">{days}<span className="ml-1 text-sm text-muted-foreground">giorni</span></span>
          </div>
          <Slider min={1} max={14} step={1} value={[days]} onValueChange={(v) => setDays(v[0])} />
        </div>
        <div className="space-y-2">
          <Label>Budget settimanale (€)</Label>
          <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Budget mensile (€)</Label>
          <Input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} />
        </div>
        <Button className="w-full" onClick={save}>Salva</Button>
      </div>
    </div>
  );
}