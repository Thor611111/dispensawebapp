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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link2, Loader2, Sparkles } from "lucide-react";
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
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const importFromUrl = async () => {
    if (!url.trim()) return toast.error("Inserisci un URL");
    setImporting(true);
    const { data, error } = await supabase.functions.invoke("ai-import-recipe", { body: { url } });
    setImporting(false);
    if (error || data?.error) return toast.error(error?.message ?? data?.error);
    setTitle(data.title ?? "");
    setPrep(data.prep_minutes ? String(data.prep_minutes) : "");
    setCost(data.estimated_cost ? String(data.estimated_cost) : "");
    setDiff(data.difficulty ?? "");
    setServings(data.servings ? String(data.servings) : "2");
    setInstructions(data.instructions ?? "");
    setIngredientsText((data.ingredients ?? []).map((i: any) => [i.quantity, i.unit, i.name].filter(Boolean).join(" ")).join("\n"));
    toast.success("Ricetta importata, controlla e salva");
  };

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
      const parsed = lines.map((l) => {
        // "200 g pasta" / "2 pz uova" / "pasta"
        const m = l.match(/^([\d.,]+)\s*([a-zA-Zàèéìòù]+)?\s+(.+)$/);
        if (m) {
          const qty = Number(m[1].replace(",", "."));
          const unit = m[2] ?? null;
          const name = m[3].trim();
          return { recipe_id: rec.id, name, quantity: Number.isFinite(qty) ? qty : null, unit };
        }
        return { recipe_id: rec.id, name: l, quantity: null, unit: null };
      });
      await supabase.from("recipe_ingredients").insert(parsed);
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ["recipes", hid] });
    toast.success("Ricetta creata");
    nav({ to: "/ricette" });
  };

  return (
    <div>
      <PageHeader title="Nuova ricetta" subtitle="Salva la tua ricetta personale." />
      <Tabs defaultValue="manual" className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="manual" className="flex-1">Manuale</TabsTrigger>
          <TabsTrigger value="url" className="flex-1"><Link2 className="mr-1 h-3.5 w-3.5" /> Da link</TabsTrigger>
        </TabsList>
        <TabsContent value="url" className="space-y-3">
          <p className="text-sm text-muted-foreground">Incolla l'URL di una ricetta. L'AI estrae ingredienti e passi.</p>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          <Button onClick={importFromUrl} disabled={importing} className="w-full">
            {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importo…</> : <><Sparkles className="h-4 w-4" /> Importa con AI</>}
          </Button>
        </TabsContent>
        <TabsContent value="manual" />
      </Tabs>
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