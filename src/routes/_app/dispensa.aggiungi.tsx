import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useHouseholdId } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dispensa/aggiungi")({ component: Aggiungi });

type Parsed = { name: string; quantity: number; unit: string; category?: string; location: string; price?: number; shelf_life_days?: number; _keep?: boolean };

function Aggiungi() {
  const { data: hid } = useHouseholdId();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("pz");
  const [location, setLocation] = useState("pantry");
  const [expires, setExpires] = useState("");
  const [price, setPrice] = useState("");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Parsed[]>([]);
  const [saving, setSaving] = useState(false);

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hid) return;
    setSaving(true);
    const { error } = await supabase.from("food_items").insert({
      household_id: hid,
      name,
      quantity: Number(qty),
      unit,
      location: location as never,
      expires_on: expires || null,
      price: price ? Number(price) : null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Aggiunto");
    navigate({ to: "/dispensa" });
  };

  const parseAi = async () => {
    if (!text.trim()) return;
    setParsing(true);
    const { data, error } = await supabase.functions.invoke("ai-parse-food", { body: { text } });
    setParsing(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    setParsed((data.items ?? []).map((i: Parsed) => ({ ...i, _keep: true })));
  };

  const saveParsed = async () => {
    if (!hid) return;
    const keep = parsed.filter((p) => p._keep);
    if (!keep.length) return;
    setSaving(true);
    const today = new Date();
    const rows = keep.map((p) => {
      const exp = p.shelf_life_days ? new Date(today.getTime() + p.shelf_life_days * 86400000).toISOString().slice(0, 10) : null;
      return {
        household_id: hid,
        name: p.name,
        quantity: p.quantity ?? 1,
        unit: p.unit ?? "pz",
        location: (p.location ?? "pantry") as never,
        category: p.category ?? null,
        price: p.price ?? null,
        expires_on: exp,
      };
    });
    const { error } = await supabase.from("food_items").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} alimenti aggiunti`);
    navigate({ to: "/dispensa" });
  };

  return (
    <div>
      <PageHeader title="Aggiungi alimento" subtitle="Manuale o con l'aiuto dell'AI." />
      <Tabs defaultValue="manual">
        <TabsList className="w-full">
          <TabsTrigger value="manual" className="flex-1">Manuale</TabsTrigger>
          <TabsTrigger value="ai" className="flex-1"><Sparkles className="mr-1 h-3.5 w-3.5" /> AI</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-3">
          <form onSubmit={saveManual} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Yogurt greco" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantità</Label>
                <Input type="number" step="0.01" required value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Unità</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Posizione</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fridge">Frigo</SelectItem>
                  <SelectItem value="freezer">Freezer</SelectItem>
                  <SelectItem value="pantry">Dispensa</SelectItem>
                  <SelectItem value="other">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Scadenza</Label>
                <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Prezzo (€)</Label>
                <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? "Salvataggio…" : "Aggiungi"}</Button>
          </form>
        </TabsContent>

        <TabsContent value="ai" className="space-y-3">
          <p className="text-sm text-muted-foreground">Scrivi o incolla la lista, l'AI la struttura per te.</p>
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="2 mele, 1L latte, 500g pasta, yogurt greco 4 vasetti…" />
          <Button onClick={parseAi} disabled={parsing || !text.trim()} className="w-full">
            {parsing ? <><Loader2 className="h-4 w-4 animate-spin" /> Analisi…</> : <><Sparkles className="h-4 w-4" /> Analizza con AI</>}
          </Button>

          {parsed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Conferma gli alimenti:</p>
              {parsed.map((p, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${p._keep ? "bg-card" : "bg-muted opacity-60"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.quantity} {p.unit} · {p.location}{p.shelf_life_days ? ` · ~${p.shelf_life_days}g` : ""}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setParsed(parsed.map((x, idx) => idx === i ? { ...x, _keep: !x._keep } : x))}>
                    {p._keep ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4" />}
                  </Button>
                </div>
              ))}
              <Button className="w-full" onClick={saveParsed} disabled={saving}>
                {saving ? "Salvataggio…" : `Aggiungi ${parsed.filter((p) => p._keep).length} alimenti`}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}