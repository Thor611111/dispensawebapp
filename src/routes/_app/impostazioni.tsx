import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useHouseholdId, usePreferences, useExpenses } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/impostazioni")({ component: Impostazioni });

const DIETS = [
  { v: "omnivore", l: "Onnivoro" }, { v: "vegetarian", l: "Vegetariano" }, { v: "vegan", l: "Vegano" },
  { v: "pescatarian", l: "Pescetariano" }, { v: "gluten_free", l: "Senza glutine" },
  { v: "lactose_free", l: "Senza lattosio" }, { v: "mediterranean", l: "Mediterranea" }, { v: "keto", l: "Keto" },
] as const;

function Impostazioni() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { data: hid } = useHouseholdId();
  const { data: prefs } = usePreferences(hid);
  const { data: expenses = [] } = useExpenses(hid);

  const [size, setSize] = useState(2);
  const [diets, setDiets] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [budget, setBudget] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    if (prefs) {
      setSize(prefs.household_size);
      setDiets(prefs.diets ?? []);
      setAllergies((prefs.allergies ?? []).join(", "));
      setBudget(prefs.weekly_budget ? String(prefs.weekly_budget) : "");
      setMonthlyBudget(prefs.monthly_budget ? String(prefs.monthly_budget) : "");
    }
  }, [prefs]);

  const save = async () => {
    if (!hid) return toast.error("Profilo in preparazione, riprova tra un secondo");
    const { error } = await supabase.from("user_preferences").upsert({
      household_id: hid,
      household_size: size,
      diets: diets as never,
      allergies: allergies.split(",").map((s) => s.trim()).filter(Boolean),
      weekly_budget: budget ? Number(budget) : null,
      monthly_budget: monthlyBudget ? Number(monthlyBudget) : null,
    });
    if (error) return toast.error(error.message);
    await queryClient.invalidateQueries({ queryKey: ["prefs", hid] });
    toast.success("Salvato");
  };

  const toggle = (v: string) => setDiets(diets.includes(v) ? diets.filter((d) => d !== v) : [...diets, v]);

  // Spesa ultima settimana
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekSpent = expenses.filter((e) => new Date(e.spent_on) >= weekAgo).reduce((s, e) => s + Number(e.amount), 0);

  const logout = async () => {
    await signOut();
    nav({ to: "/" });
  };

  const deleteAccount = async () => {
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) return toast.error(error.message);
    await signOut();
    toast.success("Account eliminato");
    nav({ to: "/" });
  };

  const changePassword = async () => {
    if (newPwd.length < 6) return toast.error("La password deve essere di almeno 6 caratteri");
    if (newPwd !== confirmPwd) return toast.error("Le password non coincidono");
    setPwdLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setPwdLoading(false);
    if (error) return toast.error(error.message);
    setNewPwd(""); setConfirmPwd("");
    toast.success("Password aggiornata");
  };

  return (
    <div>
      <PageHeader title="Profilo" subtitle={user?.email ?? ""} />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Spesa 7 giorni</p>
          <p className="mt-1 text-2xl font-bold">{weekSpent.toFixed(2)} €</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Budget settimanale</p>
          <p className="mt-1 text-2xl font-bold">{prefs?.weekly_budget ? `${prefs.weekly_budget} €` : "—"}</p>
        </div>
      </div>

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
        <div className="space-y-2">
          <Label>Budget settimanale (€)</Label>
          <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Budget mensile (€)</Label>
          <Input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(e.target.value)} />
        </div>
        <Button className="w-full" onClick={save}>Salva preferenze</Button>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="font-semibold">Modifica password</p>
          <div className="space-y-2">
            <Label>Nuova password</Label>
            <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Conferma password</Label>
            <Input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
          </div>
          <Button variant="secondary" className="w-full" disabled={pwdLoading} onClick={changePassword}>
            {pwdLoading ? "Aggiornamento…" : "Aggiorna password"}
          </Button>
        </div>

        <Button variant="outline" className="w-full" onClick={logout}><LogOut className="h-4 w-4" /> Esci</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full"><Trash2 className="h-4 w-4" /> Elimina account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminare definitivamente l'account?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione è irreversibile. Tutti i tuoi dati (dispensa, spesa, piani, preferenze) verranno eliminati per sempre.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAccount}>Elimina per sempre</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}