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
import { Sparkles, Loader2, Check, X, Barcode, CameraOff } from "lucide-react";
import { toast } from "sonner";
import { BrowserMultiFormatReader } from "@zxing/browser";

export const Route = createFileRoute("/_app/dispensa/aggiungi")({
  component: Aggiungi,
  validateSearch: (s: Record<string, unknown>) => ({
    scan: typeof s.scan === "number" || typeof s.scan === "string" ? s.scan : undefined,
  }),
});

type Parsed = { name: string; quantity: number; unit: string; category?: string; location: string; price?: number; shelf_life_days?: number; _keep?: boolean };

const UNIT_OPTIONS = [
  { v: "pz", l: "pezzi" },
  { v: "confezione", l: "confezione" },
  { v: "g", l: "grammi (g)" },
  { v: "kg", l: "chilogrammi (kg)" },
  { v: "ml", l: "millilitri (ml)" },
  { v: "l", l: "litri (l)" },
] as const;

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
  const [category, setCategory] = useState("");
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
        // Categoria
        const catRaw: string =
          (p.categories_tags?.[0] as string)?.replace(/^[a-z]{2}:/, "")?.replace(/-/g, " ") ||
          (p.categories?.split(",")[0] ?? "").trim();
        if (catRaw) setCategory(catRaw);
        // Quantità standard dalla confezione
        const qStr = (p.quantity ?? "").toString().toLowerCase();
        const m = qStr.match(/([\d.,]+)\s*(kg|g|l|ml|cl)/);
        if (m) {
          const num = parseFloat(m[1].replace(",", "."));
          const u = m[2];
          if (u === "kg") { setQty(String(num)); setUnit("kg"); }
          else if (u === "g") { setQty(String(num)); setUnit("g"); }
          else if (u === "l") { setQty(String(num)); setUnit("l"); }
          else if (u === "ml") { setQty(String(num)); setUnit("ml"); }
          else if (u === "cl") { setQty(String(num * 10)); setUnit("ml"); }
        } else {
          setQty("1");
          setUnit("pz");
        }
        toast.success(`Trovato: ${productName}`);
        setTab("manual");
      } else {
        toast.message(`Codice ${code}: prodotto non trovato. Compila a mano.`);
        setTab("manual");
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
      category: category.trim() || null,
      pantry_id: effectivePantry,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["food", hid] });
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
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => <SelectItem key={u.v} value={u.v}>{u.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria <span className="text-xs text-muted-foreground">(facoltativa)</span></Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="es. Latticini, Verdura…" />
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
            <div className="space-y-1.5">
              <Label>Scadenza</Label>
              <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prezzo (€) <span className="text-xs text-muted-foreground">(facoltativo)</span></Label>
              <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={saving || loadingHousehold}>{saving ? "Salvataggio…" : "Aggiungi"}</Button>
          </form>
        </TabsContent>

        <TabsContent value="barcode" className="space-y-3">
          <p className="text-sm text-muted-foreground">Inquadra il codice. Compilo nome, categoria, quantità e scadenza per te.</p>
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