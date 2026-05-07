import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ensureHousehold } from "@/lib/household";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

const DIETS = [
  { v: "omnivore", l: "Onnivoro" },
  { v: "vegetarian", l: "Vegetariano" },
  { v: "vegan", l: "Vegano" },
  { v: "pescatarian", l: "Pescetariano" },
  { v: "gluten_free", l: "Senza glutine" },
  { v: "lactose_free", l: "Senza lattosio" },
  { v: "mediterranean", l: "Mediterranea" },
  { v: "keto", l: "Keto" },
] as const;

const GOALS = [
  { v: "healthy", l: "Mangiare sano" },
  { v: "save", l: "Risparmiare" },
  { v: "fast", l: "Cucinare veloce" },
  { v: "no_waste", l: "Zero sprechi" },
] as const;

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [hhError, setHhError] = useState<string | null>(null);
  const [size, setSize] = useState(2);
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [goals, setGoals] = useState<string[]>(["save", "healthy"]);
  const [budget, setBudget] = useState<string>("60");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    setHhError(null);
    ensureHousehold(user.id)
      .then(setHouseholdId)
      .catch((e) => {
        console.error("ensureHousehold failed", e);
        setHhError(e?.message ?? "Errore inizializzazione");
      });
  }, [loading, user, navigate]);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let hid = householdId;
      if (!hid) {
        hid = await ensureHousehold(user.id);
        setHouseholdId(hid);
      }
      const { error } = await supabase
        .from("user_preferences")
        .upsert({
          household_id: hid,
          household_size: size,
          diets: diets as never,
          allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
          goals,
          weekly_budget: budget ? Number(budget) : null,
        });
      if (error) throw error;
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      if (pErr) throw pErr;
      navigate({ to: "/dispensa" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore salvataggio";
      console.error("finish onboarding failed", e);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="p-8 text-center text-muted-foreground">Caricamento…</div>;

  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-10">
      <div className="mb-6 flex gap-1.5">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {hhError && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {hhError}{" "}
          <button
            className="underline"
            onClick={() => {
              setHhError(null);
              ensureHousehold(user.id)
                .then(setHouseholdId)
                .catch((e) => setHhError(e?.message ?? "Errore"));
            }}
          >
            Riprova
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Quante persone?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Per stimare le porzioni e la spesa.</p>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setSize(Math.max(1, size - 1))}>−</Button>
            <span className="w-16 text-center text-4xl font-bold">{size}</span>
            <Button variant="outline" size="icon" onClick={() => setSize(size + 1)}>+</Button>
          </div>
          <Button className="w-full" onClick={() => setStep(2)}>Continua</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Diete e preferenze</h2>
            <p className="mt-1 text-sm text-muted-foreground">Seleziona quelle che ti riguardano.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIETS.map((d) => (
              <Badge
                key={d.v}
                variant={diets.includes(d.v) ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5 text-sm"
                onClick={() => toggle(diets, d.v, setDiets)}
              >
                {d.l}
              </Badge>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Allergie o intolleranze (separate da virgola)</Label>
            <Input placeholder="arachidi, frutta a guscio…" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Indietro</Button>
            <Button onClick={() => setStep(3)} className="flex-1">Continua</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Cosa è importante per te?</h2>
            <p className="mt-1 text-sm text-muted-foreground">L'app userà questi obiettivi per scegliere ricette e piani.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Badge
                key={g.v}
                variant={goals.includes(g.v) ? "default" : "outline"}
                className="cursor-pointer px-3 py-1.5 text-sm"
                onClick={() => toggle(goals, g.v, setGoals)}
              >
                {g.l}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Indietro</Button>
            <Button onClick={() => setStep(4)} className="flex-1">Continua</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Budget settimanale</h2>
            <p className="mt-1 text-sm text-muted-foreground">Quanto vuoi spendere per la spesa a settimana? Puoi cambiarlo dopo.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="text-lg" />
            <span className="text-lg font-semibold">€</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)} className="flex-1">Indietro</Button>
            <Button onClick={finish} disabled={saving} className="flex-1">
              {saving ? "Salvataggio…" : "Inizia"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
