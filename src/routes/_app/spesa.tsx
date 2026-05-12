import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useShoppingList, useExpenses, usePreferences, useFoodItems, useRecommendedProducts, usePantries, useCurrentMealPlan, currentWeekStart } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, ShoppingBag, Trash2, Sparkles, Loader2, Check, Camera, Receipt, CalendarDays, AlertTriangle, CheckCircle2, HelpCircle, PackagePlus, History } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { reconcileReceipt, type ReceiptRow } from "@/lib/receipt-match";
import { toast } from "sonner";
import { QuantityStepper } from "@/components/QuantityStepper";

export const Route = createFileRoute("/_app/spesa")({ component: Spesa });

function Spesa() {
  const { data: hid } = useHouseholdId();
  const { data: items = [] } = useShoppingList(hid);
  const { data: expenses = [] } = useExpenses(hid);
  const { data: prefs } = usePreferences(hid);
  const { data: foods = [] } = useFoodItems(hid);
  const { data: recs = [] } = useRecommendedProducts(hid);
  const { data: pantries = [] } = usePantries(hid);
  const { data: currentPlan } = useCurrentMealPlan(hid);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [planGenLoading, setPlanGenLoading] = useState(false);
  const [pantryId, setPantryId] = useState<string>("");
  const [buyItem, setBuyItem] = useState<any>(null);
  const [buyPrice, setBuyPrice] = useState("");
  const [buyQty, setBuyQty] = useState("1");
  const [closeOpen, setCloseOpen] = useState(false);
  const [totalAmount, setTotalAmount] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ items: any[]; total: number; subtotal: number | null; discounts: number | null } | null>(null);
  const [recRows, setRecRows] = useState<ReceiptRow[]>([]);
  const [recTotal, setRecTotal] = useState<string>("");
  const [closing, setClosing] = useState(false);
  const search = useSearch({ strict: false }) as { scan?: number | string };
  const [closeTab, setCloseTab] = useState<string>("total");

  useEffect(() => {
    if (search?.scan) {
      setCloseTab("scan");
      setCloseOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectivePantry = pantryId || pantries[0]?.id || null;

  // Ask AI to classify items: location, category, shelf-life, kcal
  const classifyFoods = async (items: { name: string; unit?: string | null }[]): Promise<Record<string, any>> => {
    if (!items.length) return {};
    try {
      const { data } = await supabase.functions.invoke("ai-classify-foods", { body: { names: items } });
      const map: Record<string, any> = {};
      for (const it of (data?.items ?? [])) map[it.name.toLowerCase()] = it;
      return map;
    } catch {
      return {};
    }
  };

  const enrich = (row: any, info: any) => {
    if (!info) return row;
    const today = new Date();
    const exp = info.shelf_life_days ? new Date(today.getTime() + info.shelf_life_days * 86400000).toISOString().slice(0, 10) : null;
    return {
      ...row,
      location: (info.location ?? row.location ?? "pantry"),
      category: info.category ?? row.category ?? null,
      kcal_per_unit: info.kcal_per_unit ?? row.kcal_per_unit ?? null,
      expires_on: row.expires_on ?? exp,
    };
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hid || !name.trim()) return;
    await supabase.from("shopping_list_items").insert({ household_id: hid, name });
    setName("");
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
  };

  const toggle = async (id: string, v: boolean) => {
    await supabase.from("shopping_list_items").update({ checked: v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
  };

  const remove = async (id: string) => {
    await supabase.from("shopping_list_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
  };

  const openBuy = (it: any) => {
    setBuyItem(it);
    setBuyPrice(it.estimated_price ? String(it.estimated_price) : "");
    setBuyQty(String(it.quantity ?? 1));
  };

  const confirmBuy = async () => {
    if (!hid || !buyItem) return;
    const price = buyPrice ? Number(buyPrice) : 0;
    const qty = Number(buyQty) || 1;
    const today = new Date().toISOString().slice(0, 10);
    const info = await classifyFoods([{ name: buyItem.name, unit: buyItem.unit ?? "pz" }]);
    const base = {
      household_id: hid, name: buyItem.name, quantity: qty, unit: buyItem.unit ?? "pz",
      location: "pantry" as const, price: price || null, pantry_id: effectivePantry,
    };
    await supabase.from("food_items").insert(enrich(base, info[buyItem.name.toLowerCase()]));
    if (price > 0) await supabase.from("expenses").insert({ household_id: hid, amount: price, spent_on: today, note: `Spesa: ${buyItem.name}` });
    await supabase.from("shopping_list_items").delete().eq("id", buyItem.id);
    setBuyItem(null);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
    qc.invalidateQueries({ queryKey: ["food", hid] });
    qc.invalidateQueries({ queryKey: ["expenses", hid] });
    toast.success("Aggiunto in dispensa");
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const onReceiptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setScanLoading(true);
    setScanResult(null);
    setRecRows([]);
    const b64 = await fileToBase64(f);
    const { data, error } = await supabase.functions.invoke("ai-scan-receipt", { body: { imageBase64: b64 } });
    setScanLoading(false);
    if (error || data?.error) {
      const msg = error?.message ?? data?.error ?? "Errore scansione scontrino";
      return toast.error(msg);
    }
    if (!data?.items?.length) return toast.error("Nessun articolo riconosciuto. Riprova con una foto pi\u00f9 nitida.");
    const ocrItems = (data.items ?? []) as any[];
    const total = Number(data.total ?? 0);
    setScanResult({ items: ocrItems, total, subtotal: data.subtotal ?? null, discounts: data.discounts ?? null });
    setRecRows(reconcileReceipt(ocrItems, items as any, effectivePantry));
    setRecTotal(total ? String(total.toFixed(2)) : "");
    if (!totalAmount && total) setTotalAmount(String(total));
  };

  const updateRow = (key: string, patch: Partial<ReceiptRow>) => {
    setRecRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const purchasedRows = recRows.filter((r) => r.purchased);
  const purchasedSubtotal = purchasedRows.reduce((s, r) => s + Number(r.price ?? 0), 0);
  const recTotalNum = Number(recTotal) || 0;
  const totalDiff = recTotalNum - purchasedSubtotal;
  const missingPriceCount = purchasedRows.filter((r) => r.price == null || isNaN(Number(r.price))).length;

  const closeWithTotal = async () => {
    if (!hid) return;
    const checked = items.filter((i) => i.checked);
    if (!checked.length) return toast.error("Nessun articolo spuntato");
    const total = Number(totalAmount);
    if (!total || total <= 0) return toast.error("Inserisci l'importo totale");
    setClosing(true);
    const today = new Date().toISOString().slice(0, 10);
    const info = await classifyFoods(checked.map((c) => ({ name: c.name, unit: c.unit ?? "pz" })));
    await supabase.from("food_items").insert(checked.map((c) => enrich({
      household_id: hid, name: c.name, quantity: c.quantity, unit: c.unit,
      location: "pantry" as const, price: c.estimated_price, pantry_id: effectivePantry,
    }, info[c.name.toLowerCase()])));
    await supabase.from("expenses").insert({ household_id: hid, amount: total, spent_on: today, note: "Spesa" });
    await supabase.from("shopping_list_items").delete().in("id", checked.map((c) => c.id));
    setClosing(false);
    setCloseOpen(false);
    setTotalAmount("");
    setScanResult(null);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
    qc.invalidateQueries({ queryKey: ["food", hid] });
    qc.invalidateQueries({ queryKey: ["expenses", hid] });
    toast.success(`${checked.length} articoli in dispensa, ${total.toFixed(2)} € registrati`);
  };

  const closeWithScan = async () => {
    if (!hid || !recRows.length) return;
    if (missingPriceCount > 0) return toast.error(`Inserisci il prezzo per ${missingPriceCount} articoli`);
    const total = recTotalNum > 0 ? recTotalNum : purchasedSubtotal;
    if (total <= 0) return toast.error("Totale spesa non valido");
    setClosing(true);
    const today = new Date().toISOString().slice(0, 10);
    const info = await classifyFoods(purchasedRows.map((r) => ({ name: r.name, unit: r.unit || "pz" })));
    const foodRows = purchasedRows.map((r) => enrich({
      household_id: hid,
      name: r.name,
      quantity: r.quantity || 1,
      unit: r.unit || "pz",
      location: "pantry" as const,
      price: r.price ?? null,
      pantry_id: r.pantryId || effectivePantry,
    }, info[r.name.toLowerCase()]));
    if (foodRows.length) await supabase.from("food_items").insert(foodRows);
    await supabase.from("expenses").insert({ household_id: hid, amount: total, spent_on: today, note: "Spesa (scontrino)" });
    const usedShoppingIds = purchasedRows.map((r) => r.shopping?.id).filter(Boolean) as string[];
    if (usedShoppingIds.length) await supabase.from("shopping_list_items").delete().in("id", usedShoppingIds);
    setClosing(false);
    setCloseOpen(false);
    setScanResult(null);
    setRecRows([]);
    setRecTotal("");
    setTotalAmount("");
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
    qc.invalidateQueries({ queryKey: ["food", hid] });
    qc.invalidateQueries({ queryKey: ["expenses", hid] });
    toast.success(`${foodRows.length} articoli in dispensa · ${total.toFixed(2)} € registrati`);
  };

  const total = items.filter((i) => !i.checked).reduce((s, i) => s + Number(i.estimated_price ?? 0), 0);
  const checkedCount = items.filter((i) => i.checked).length;

  const weekStart = currentWeekStart();
  const weekSpent = expenses.filter((e) => e.spent_on >= weekStart).reduce((s, e) => s + Number(e.amount), 0);
  const budget = prefs?.weekly_budget ? Number(prefs.weekly_budget) : 0;
  const remaining = budget - weekSpent;
  const pct = budget > 0 ? Math.min(100, (weekSpent / budget) * 100) : 0;

  const generateRecs = async () => {
    if (!hid) return;
    setGenLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-suggest-products", { body: { foodItems: foods, preferences: prefs, expenses } });
    if (error || data?.error) { setGenLoading(false); return toast.error(error?.message ?? data?.error); }
    await supabase.from("recommended_products").delete().eq("household_id", hid);
    const rows = (data.products ?? []).map((p: any) => ({ household_id: hid, name: p.name, category: p.category ?? null, reason: p.reason ?? null }));
    if (rows.length) await supabase.from("recommended_products").insert(rows);
    setGenLoading(false);
    qc.invalidateQueries({ queryKey: ["recommended", hid] });
  };

  const addRecToList = async (rec: any) => {
    if (!hid) return;
    await supabase.from("shopping_list_items").insert({ household_id: hid, name: rec.name, source: "ai" });
    await supabase.from("recommended_products").delete().eq("id", rec.id);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
    qc.invalidateQueries({ queryKey: ["recommended", hid] });
  };

  const generateFromPlan = async () => {
    if (!hid) return;
    const entries = (currentPlan as any)?.meal_plan_entries ?? [];
    if (!entries.length) {
      return toast.error("Nessun piano pasti per questa settimana. Vai su Piano per generarlo.");
    }
    setPlanGenLoading(true);
    const meals = entries.map((e: any) => ({ title: e.recipe_title_snapshot ?? e.recipes?.title, notes: e.notes }));
    const { data, error } = await supabase.functions.invoke("ai-plan-to-shopping", {
      body: { meals, pantry: foods, preferences: prefs },
    });
    if (error || data?.error) { setPlanGenLoading(false); return toast.error(error?.message ?? data?.error); }
    const missing = (data.items ?? []) as any[];
    const existingNames = new Set(items.map((c: any) => c.name.toLowerCase()));
    const toInsert = missing
      .filter((m) => !existingNames.has(m.name.toLowerCase()))
      .map((m) => ({
        household_id: hid, name: m.name, quantity: m.quantity ?? 1, unit: m.unit ?? "pz",
        category: m.category ?? null, source: "plan",
      }));
    if (toInsert.length) await supabase.from("shopping_list_items").insert(toInsert);
    setPlanGenLoading(false);
    qc.invalidateQueries({ queryKey: ["shopping", hid] });
    toast.success(toInsert.length ? `${toInsert.length} articoli aggiunti dal piano` : "Tutto già in lista");
  };

  return (
    <div>
      <PageHeader title="Lista spesa" subtitle={total > 0 ? `Stima rimanente: ~${total.toFixed(2)} €` : "Aggiungi cosa ti serve."} />

      {pantries.length > 0 && (
        <div className="mb-4 rounded-2xl border bg-card p-3">
          <Label className="text-xs text-muted-foreground">Dispensa di destinazione</Label>
          <Select value={pantryId || pantries[0]?.id} onValueChange={setPantryId}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {pantries.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {budget > 0 && (
        <div className="mb-4 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Settimana</span>
            <span className={`font-semibold ${remaining < 0 ? "text-destructive" : "text-primary"}`}>{remaining.toFixed(2)} € rimanenti</span>
          </div>
          <Progress value={pct} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">Speso {weekSpent.toFixed(2)} di {budget.toFixed(2)} €</p>
        </div>
      )}

      <div className="mb-4 rounded-2xl border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Consigliati per te</h3>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={generateFromPlan} disabled={planGenLoading} title="Genera dal piano pasti settimanale">
              {planGenLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarDays className="h-3 w-3" />} Dal piano
            </Button>
            <Button size="sm" variant="ghost" onClick={generateRecs} disabled={genLoading}>
              {genLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {recs.length ? "Aggiorna" : "Genera"}
            </Button>
          </div>
        </div>
        {recs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Tocca "Genera" per ricevere suggerimenti dall'AI.</p>
        ) : (
          <ul className="space-y-1.5">
            {recs.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg bg-secondary/40 p-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  {r.reason && <p className="truncate text-xs text-muted-foreground">{r.reason}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => addRecToList(r)}><Plus className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aggiungi articolo…" />
        <Button type="submit" size="icon"><Plus className="h-4 w-4" /></Button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Lista vuota.</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <Checkbox checked={it.checked} onCheckedChange={(v) => toggle(it.id, !!v)} />
              <div className="flex-1 min-w-0">
                <p className={`truncate text-sm ${it.checked ? "text-muted-foreground line-through" : ""}`}>{it.name}</p>
                {it.estimated_price ? <p className="text-xs text-muted-foreground">{Number(it.estimated_price).toFixed(2)} €</p> : null}
                <div className="mt-1.5">
                  <QuantityStepper
                    value={Number(it.quantity ?? 0)}
                    unit={it.unit}
                    onChange={async (n) => {
                      if (n <= 0) { await supabase.from("shopping_list_items").delete().eq("id", it.id); }
                      else { await supabase.from("shopping_list_items").update({ quantity: n }).eq("id", it.id); }
                      qc.invalidateQueries({ queryKey: ["shopping", hid] });
                    }}
                  />
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => openBuy(it)} title="Acquistato"><Check className="h-4 w-4 text-primary" /></Button>
              <Button size="icon" variant="ghost" onClick={() => remove(it.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
            </li>
          ))}
        </ul>
      )}

      {checkedCount > 0 && (
        <Button className="mt-4 w-full" onClick={() => setCloseOpen(true)}><ShoppingBag className="h-4 w-4" /> Chiudi spesa ({checkedCount})</Button>
      )}

      {/* Single item purchase dialog */}
      <Dialog open={!!buyItem} onOpenChange={(o) => !o && setBuyItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Acquistato: {buyItem?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Quantità</Label><Input type="number" step="0.01" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Prezzo (€)</Label><Input type="number" step="0.01" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)} placeholder="0.00" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Verrà aggiunto a {pantries.find((p) => p.id === effectivePantry)?.name ?? "dispensa"} e scalato dal budget.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyItem(null)}>Annulla</Button>
            <Button onClick={confirmBuy}>Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close shopping dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chiudi spesa</DialogTitle></DialogHeader>
          <Tabs value={closeTab} onValueChange={setCloseTab}>
            <TabsList className="w-full">
              <TabsTrigger value="total" className="flex-1"><Receipt className="mr-1 h-3.5 w-3.5" />Totale</TabsTrigger>
              <TabsTrigger value="scan" className="flex-1"><Camera className="mr-1 h-3.5 w-3.5" />Foto scontrino</TabsTrigger>
            </TabsList>
            <TabsContent value="total" className="space-y-3">
              <div className="space-y-1.5">
                <Label>Importo totale scontrino (€)</Label>
                <Input type="number" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="es. 42.80" />
              </div>
              <p className="text-xs text-muted-foreground">{checkedCount} articoli verranno aggiunti in dispensa.</p>
              <Button className="w-full" onClick={closeWithTotal} disabled={closing}>{closing ? "Salvataggio…" : "Conferma"}</Button>
            </TabsContent>
            <TabsContent value="scan" className="space-y-3">
              <Label className="block">
                <div className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground hover:bg-secondary/30">
                  {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {scanLoading ? "Analisi…" : "Scatta o carica scontrino"}
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onReceiptFile} disabled={scanLoading} />
              </Label>
              {scanResult && recRows.length > 0 && (
                <div className="space-y-3">
                  <div className="rounded-lg bg-secondary/30 p-2 text-xs text-muted-foreground">
                    OCR: {scanResult.items.length} articoli rilevati
                    {scanResult.subtotal != null ? ` · subtot ${Number(scanResult.subtotal).toFixed(2)} €` : ""}
                    {scanResult.discounts ? ` · sconti ${Number(scanResult.discounts).toFixed(2)} €` : ""}
                    {scanResult.total ? ` · totale ${scanResult.total.toFixed(2)} €` : ""}
                  </div>
                  <ul className="max-h-[50vh] space-y-2 overflow-auto pr-1">
                    {recRows.map((r) => {
                      const StatusIcon = r.status === "matched" ? CheckCircle2 : r.status === "missing_from_list" ? PackagePlus : HelpCircle;
                      const statusColor = r.status === "matched" ? "text-primary" : r.status === "missing_from_list" ? "text-amber-500" : "text-muted-foreground";
                      const statusLabel = r.status === "matched" ? "In lista" : r.status === "missing_from_list" ? "In lista, non rilevato" : "Da confermare";
                      return (
                        <li key={r.key} className={`rounded-xl border p-2.5 ${r.purchased ? "bg-card" : "bg-secondary/20 opacity-80"}`}>
                          <div className="flex items-start gap-2">
                            <StatusIcon className={`mt-1 h-4 w-4 shrink-0 ${statusColor}`} />
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{statusLabel}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-muted-foreground">Acquistato</span>
                                  <Switch checked={r.purchased} onCheckedChange={(v) => updateRow(r.key, { purchased: !!v })} />
                                </div>
                              </div>
                              <Input value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })} className="h-8 text-sm" />
                              <div className="grid grid-cols-3 gap-1.5">
                                <Input type="number" step="0.01" placeholder="Qtà" value={r.quantity} onChange={(e) => updateRow(r.key, { quantity: Number(e.target.value) })} className="h-8 text-xs" />
                                <Input placeholder="Unità" value={r.unit} onChange={(e) => updateRow(r.key, { unit: e.target.value })} className="h-8 text-xs" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="€"
                                  value={r.price ?? ""}
                                  onChange={(e) => updateRow(r.key, { price: e.target.value === "" ? null : Number(e.target.value) })}
                                  className={`h-8 text-xs ${r.purchased && r.price == null ? "border-destructive" : ""}`}
                                />
                              </div>
                              {r.purchased && pantries.length > 1 && (
                                <Select value={r.pantryId ?? effectivePantry ?? ""} onValueChange={(v) => updateRow(r.key, { pantryId: v })}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Dispensa" /></SelectTrigger>
                                  <SelectContent>
                                    {pantries.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="rounded-xl border bg-card p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Articoli confermati</span>
                      <span className="font-medium">{purchasedSubtotal.toFixed(2)} €</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Label className="text-muted-foreground">Totale scontrino</Label>
                      <Input type="number" step="0.01" value={recTotal} onChange={(e) => setRecTotal(e.target.value)} className="h-8 flex-1" />
                      <span className="text-xs text-muted-foreground">€</span>
                    </div>
                    {Math.abs(totalDiff) > 0.5 && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Differenza {totalDiff > 0 ? "+" : ""}{totalDiff.toFixed(2)} € (sconti, articoli non identificati o prezzi mancanti).
                      </p>
                    )}
                    {missingPriceCount > 0 && (
                      <p className="mt-1 text-xs text-destructive">{missingPriceCount} prezzi mancanti per articoli acquistati.</p>
                    )}
                  </div>
                  <Button className="w-full" onClick={closeWithScan} disabled={closing}>
                    {closing ? "Salvataggio…" : `Conferma · ${purchasedRows.length} in dispensa · ${(recTotalNum > 0 ? recTotalNum : purchasedSubtotal).toFixed(2)} €`}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}