import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useHouseholdId, useExpenses } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/spesa/storico")({ component: Storico });

function Storico() {
  const { data: hid } = useHouseholdId();
  const { data: expenses = [] } = useExpenses(hid);
  const qc = useQueryClient();

  const [editing, setEditing] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const openEdit = (e: any) => {
    setEditing(e);
    setAmount(String(e.amount));
    setDate(e.spent_on);
    setNote(e.note ?? "");
  };

  const openAdd = () => {
    setEditing(null);
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setNote("Rettifica manuale");
    setAddOpen(true);
  };

  const save = async () => {
    if (!hid) return;
    const a = Number(amount);
    if (!Number.isFinite(a) || a === 0) return toast.error("Importo non valido");
    if (!date) return toast.error("Data richiesta");
    if (editing) {
      const { error } = await supabase.from("expenses").update({ amount: a, spent_on: date, note: note || null }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Spesa aggiornata");
    } else {
      const { error } = await supabase.from("expenses").insert({ household_id: hid, amount: a, spent_on: date, note: note || null });
      if (error) return toast.error(error.message);
      toast.success("Rettifica registrata");
    }
    setEditing(null);
    setAddOpen(false);
    qc.invalidateQueries({ queryKey: ["expenses", hid] });
  };

  const remove = async () => {
    if (!delId) return;
    const { error } = await supabase.from("expenses").delete().eq("id", delId);
    setDelId(null);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["expenses", hid] });
    toast.success("Spesa eliminata");
  };

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <PageHeader
        title="Storico spese"
        subtitle={`${expenses.length} voci · totale ${total.toFixed(2)} €`}
        right={
          <Button asChild size="sm" variant="ghost">
            <Link to="/spesa"><ArrowLeft className="h-4 w-4" /> Spesa</Link>
          </Button>
        }
      />

      <Button className="mb-4 w-full" onClick={openAdd}>
        <Plus className="h-4 w-4" /> Aggiungi rettifica manuale
      </Button>

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Nessuna spesa registrata.</div>
      ) : (
        <ul className="space-y-2">
          {expenses.map((e) => {
            const neg = Number(e.amount) < 0;
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`font-medium ${neg ? "text-emerald-600" : ""}`}>
                      {neg ? "" : "+"}{Number(e.amount).toFixed(2)} €
                    </p>
                    <span className="text-xs text-muted-foreground">{e.spent_on}</span>
                  </div>
                  {e.note && <p className="truncate text-xs text-muted-foreground">{e.note}</p>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setDelId(e.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={!!editing || addOpen} onOpenChange={(o) => { if (!o) { setEditing(null); setAddOpen(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifica spesa" : "Aggiungi rettifica"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Importo (€) — usa segno meno per rimborsi</Label>
              <Input type="number" step="0.01" value={amount} onChange={(ev) => setAmount(ev.target.value)} placeholder="es. -5.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nota</Label>
              <Input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="es. Rimborso prodotto difettoso" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setAddOpen(false); }}>Annulla</Button>
            <Button onClick={save}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la spesa?</AlertDialogTitle>
            <AlertDialogDescription>L'importo verr\u00e0 rimosso dal saldo. Azione irreversibile.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Elimina</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}