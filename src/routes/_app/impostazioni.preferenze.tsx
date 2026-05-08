import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHouseholdId, usePreferences } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SettingsPageHeader } from "@/components/SettingsPage";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/impostazioni/preferenze")({ component: Page });

const DIETS = [
  { v: "omnivore", l: "Onnivoro" }, { v: "vegetarian", l: "Vegetariano" }, { v: "vegan", l: "Vegano" },
  { v: "pescatarian", l: "Pescetariano" }, { v: "gluten_free", l: "Senza glutine" },
  { v: "lactose_free", l: "Senza lattosio" }, { v: "mediterranean", l: "Mediterranea" }, { v: "keto", l: "Keto" },
] as const;

function Page() {
  const { data: hid } = useHouseholdId();
  const { data: prefs } = usePreferences(hid);
  const qc = useQueryClient();
  const [size, setSize] = useState(2);
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");

  useEffect(() => {
    if (prefs) {
      setSize(prefs.household_size);
      setDiets(prefs.diets ?? []);
      setAllergies((prefs.allergies ?? []).join(", "));
    }
  }, [prefs]);

  const toggle = (v: string) => setDiets(diets.includes(v) ? diets.filter((d) => d !== v) : [...diets, v]);

  const save = async () => {
    if (!hid) return;
    const { error } = await supabase.from("user_preferences").upsert({
      household_id: hid,
      household_size: size,
      diets: diets as never,
      allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["prefs", hid] });
    toast.success("Preferenze salvate");
  };

  return (
    <div>
      <SettingsPageHeader title="Preferenze alimentari" />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Persone nel nucleo</Label>
          <Input type="number" min={1} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Diete</Label>
          <div className="flex flex-wrap gap-2">
            {DIETS.map((d) => (
              <Badge key={d.v} variant={diets.includes(d.v) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggle(d.v)}>{d.l}</Badge>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Allergie</Label>
          <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="arachidi, frutta a guscio…" />
        </div>
        <Button className="w-full" onClick={save}>Salva</Button>
      </div>
    </div>
  );
}