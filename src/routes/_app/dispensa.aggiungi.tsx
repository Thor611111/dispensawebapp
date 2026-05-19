import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { ymd } from "@/lib/date";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useHouseholdId, usePantries } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Check, X, Flame, Barcode, CameraOff } from "lucide-react";
import { toast } from "sonner";
import { BrowserMultiFormatReader } from "@zxing/browser";

export const Route = createFileRoute("/_app/dispensa/aggiungi")({ component: Aggiungi });

type Parsed = { name: string; quantity: number; unit: string; category?: string; location: string; price?: number; shelf_life_days?: number; kcal_per_unit?: number; _keep?: boolean };

function Aggiungi() {
  const { data: hid, isLoading: loadingHousehold } = useHouseholdId();
  const { data: pantries = [] } = usePantries(hid);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as { scan?: number | string };
  const [tab, setTab] = useState<string>(search?.scan ? "barcode" : "manual");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("pz");
  const [location, setLocation] = useState("pantry");
  const [pantryId, setPantryId] = useState<string>("");
  const [expires, setExpires] = useState("");
  const [price, setPrice] = useState("");
  const [kcal, setKcal] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Parsed[]>([]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lookup, setLookup] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => () => { controlsRef.current?.stop(); }, []);

  useEffect(() => {
    if (search?.scan && tab === "barcode" && !scanning) {
      // auto-start scanner when arriving via shortcut
      startScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScan = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  const startScan = async () => {
    try {
      setScanning(true);
      readerRef.current ??= new BrowserMultiFormatReader();
      const controls = await readerRef.current.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result) {
          const code = result.getText();
          stopScan();
          handleBarcode(code);
        }
      });
      controlsRef.current = controls;
    } catch (e: any) {
      setScanning(false);
      toast.error(e?.message ?? "Impossibile accedere alla fotocamera");
    }
  };

  const handleBarcode = async (code: string) => {
    setLookup(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const p = json.product;
        const productName = p.product_name_it || p.product_name || `Prodotto ${code}`;
        setName(productName);
        // Open Food Facts dà kcal per 100g/100ml. Normalizziamo a kcal per 1 unità (g o ml)
        // e impostiamo unit di conseguenza.
        const per100 = p.nutriments?.["energy-kcal_100g"];
        const serving = p.nutriments?.["energy-kcal_serving"];
        if (per100) {
          const isLiquid = (p.quantity ?? "").toString().toLowerCase().match(/\b(ml|l|cl)\b/);
          setUnit(isLiquid ? "ml" : "g");
          setKcal((Number(per100) / 100).toFixed(2));
        } else if (serving) {
          setUnit("pz");
          setKcal(String(Math.round(serving)));
        }
        toast.success(`Trovato: ${productName}`);
      } else {
        toast.message(`Codice ${code}: prodotto non trovato. Compila a mano.`);
      }
    } catch {
      toast.error("Errore lookup prodotto");
    } finally {
      setLookup(false);
    }
  };

  const effectivePantry = pantryId || pantries[0]?.id || null;

  const saveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hid) return toast.error("Profilo in preparazione, riprova tra un secondo");
    if (!effectivePantry) return toast.error("Crea prima una dispensa in Impostazioni → Casa");
    setSaving(true);
    const { error } = await supabase.from("food_items").insert({
      household_id: hid,
      name,
      quantity: Number(qty),
      unit,
      location: location as never,
      expires_on: expires || null,
      price: price ? Number(price) : null,
      kcal_per_unit: kcal ? Number(kcal) : null,
      pantry_id: effectivePantry,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["food", hid] });
    toast.success("Aggiunto");
    navigate({ to: "/dispensa" });
  };

  const calcKcal = async () => {
    if (!name.trim()) return toast.error("Inserisci prima il nome");
    setCalcLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-calc-kcal", { body: { name, quantity: 1, unit } });
    setCalcLoading(false);
    if (error || data?.error) return toast.error(error?.message ?? data?.error);
    if (data?.kcal) setKcal(String(data.kcal));
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
    if (!hid) return toast.error("Profilo in preparazione, riprova tra un secondo");
    const keep = parsed.filter((p) => p._keep);
    if (!keep.length) return;
    setSaving(true);
    const today = new Date();
    const rows = keep.map((p) => {
      const exp = p.shelf_life_days ? ymd(new Date(today.getTime() + p.shelf_life_days * 86400000)) : null;
      return {
        household_id: hid,
        name: p.name,
        quantity: p.quantity ?? 1,
        unit: p.unit ?? "pz",
        location: (p.location ?? "pantry") as never,
        category: p.category ?? null,
        price: p.price ?? null,
        kcal_per_unit: p.kcal_per_unit ?? null,
        pantry_id: effectivePantry,
        expires_on: exp,
      };
    });
    const { error } = await supabase.from("food_items").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["food", hid] });
    toast.success(`${rows.length} alimenti aggiunti`);
    navigate({ to: "/dispensa" });
  };

  return (
    <div>
      <PageHeader title="Aggiungi alimento" subtitle="Manuale o con l'aiuto dell'AI." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="manual" className="flex-1">Manuale</TabsTrigger>
          <TabsTrigger value="barcode" className="flex-1"><Barcode className="mr-1 h-3.5 w-3.5" /> Codice</TabsTrigger>
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
            {pantries.length > 1 && (
              <div className="space-y-1.5">
                <Label>Dispensa</Label>
                <Select value={pantryId || pantries[0]?.id} onValueChange={setPantryId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {pantries.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
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
            <div className="space-y-1.5">
              <Label>Kcal per unità</Label>
              <div className="flex gap-2">
                <Input type="number" step="1" value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder="es. 89" />
                <Button type="button" variant="outline" onClick={calcKcal} disabled={calcLoading || !name.trim()}>
                  {calcLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />} AI
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving || loadingHousehold}>{saving ? "Salvataggio…" : "Aggiungi"}</Button>
          </form>
        </TabsContent>

        <TabsContent value="barcode" className="space-y-3">
          <p className="text-sm text-muted-foreground">Inquadra il codice a barre. Recupero dati da Open Food Facts.</p>
          <div className="overflow-hidden rounded-xl border bg-black aspect-video relative">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            {!scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Button onClick={startScan} disabled={lookup}><Barcode className="h-4 w-4" /> Avvia scanner</Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {scanning && <Button variant="outline" className="flex-1" onClick={stopScan}><CameraOff className="h-4 w-4" /> Ferma</Button>}
            {lookup && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Cerco prodotto…</div>}
          </div>
          {name && (
            <div className="rounded-xl border bg-card p-3 text-sm">
              <p className="font-medium">{name}</p>
              <p className="text-xs text-muted-foreground">Vai alla tab "Manuale" per completare e salvare.</p>
            </div>
          )}
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
              <Button className="w-full" onClick={saveParsed} disabled={saving || loadingHousehold}>
                {saving ? "Salvataggio…" : `Aggiungi ${parsed.filter((p) => p._keep).length} alimenti`}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}