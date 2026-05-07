import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/ricette/nuova")({ component: Nuova });

function Nuova() {
  const { data: hid } = useHouseholdId();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [prep, setPrep] = useState("");
  const [cost, setCost] = useState("");
  const [diff, setDiff] = useState("");
  const [servings, setServings] = useState("2");
  const [ingredientsText, setIngredientsText] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hid) return toast.error("Profilo in preparazione");
    setSaving(true);
    const { data: rec, error } = await supabase.from("recipes").insert({
      household_id: hid,
      title,
      prep_minutes: prep ? Number(prep) : null,
      estimated_cost: cost ? Number(cost) : null,
      difficulty: diff || null,
      servings: Number(servings) || 2,
      instructions,
    }).select("id").single();
    if (error || !rec) { setSaving(false); return toast.error(error?.message ?? "Errore"); }
    const lines = ingredientsText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length) {
      await supabase.from("recipe_ingredients").insert(lines.map((l) => ({ recipe_id: rec.id, name: l })));
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["recipes", hid] });
    toast.success("Ricetta creata");
    nav({ to: "/ricette" });
  };

  return (
    <div>
      <PageHeader title="Nuova ricetta" subtitle="Salva la tua ricetta personale." />
      <form onSubmit={save} className="space-y-3">
        <div className="space-y-1.5"><Label>Titolo</Label><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5"><Label>Tempo (min)</Label><Input type="number" value={prep} onChange={(e) => setPrep(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Costo (€)</Label><Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Porzioni</Label><Input type="number" value={servings} onChange={(e) => setServings(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5"><Label>Difficoltà</Label><Input value={diff} onChange={(e) => setDiff(e.target.value)} placeholder="facile / media / difficile" /></div>
        <div className="space-y-1.5"><Label>Ingredienti (uno per riga)</Label><Textarea rows={4} value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Preparazione</Label><Textarea rows={6} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvataggio…" : "Salva ricetta"}</Button>
      </form>
    </div>
  );
}