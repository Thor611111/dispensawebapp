import { createFileRoute, Outlet, useLocation, useNavigate, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useHouseholdId, usePreferences, useExpenses, useProfile, useIsAdmin } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Trash2, User, Bell, Utensils, Clock, Home as HomeIcon, ChevronRight, KeyRound, ShieldCheck } from "lucide-react";
import { InstallAppCard } from "@/components/InstallAppCard";
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
import { Slider } from "@/components/ui/slider";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/impostazioni")({ component: Impostazioni });

const DIETS = [
  { v: "omnivore", l: "Onnivoro" }, { v: "vegetarian", l: "Vegetariano" }, { v: "vegan", l: "Vegano" },
  { v: "pescatarian", l: "Pescetariano" }, { v: "gluten_free", l: "Senza glutine" },
  { v: "lactose_free", l: "Senza lattosio" }, { v: "mediterranean", l: "Mediterranea" }, { v: "keto", l: "Keto" },
] as const;

function Impostazioni() {
  const location = useLocation();
  if (location.pathname !== "/impostazioni") return <Outlet />;
  return <ImpostazioniIndex />;
}

function ImpostazioniIndex() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
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

  const sections = [
    ...(isAdmin ? [{ to: "/admin" as const, label: "Admin Dashboard", desc: "Gestione app", icon: ShieldCheck }] : []),
    { to: "/impostazioni/profilo", label: "Profilo", desc: profile?.display_name ?? user?.email ?? "", icon: User },
    { to: "/impostazioni/preferenze", label: "Preferenze alimentari", desc: "Diete, allergie, persone", icon: Utensils },
    { to: "/impostazioni/scadenze", label: "Scadenze e budget", desc: "Avvisi e tetti di spesa", icon: Clock },
    { to: "/impostazioni/notifiche", label: "Notifiche", desc: "Promemoria e canali", icon: Bell },
    { to: "/impostazioni/casa", label: "Casa & membri", desc: "Condividi il nucleo", icon: HomeIcon },
    { to: "/impostazioni/sicurezza", label: "Password e sicurezza", desc: "Cambia password", icon: KeyRound },
  ];

  return (
    <div>
      <PageHeader title="Impostazioni" subtitle={user?.email ?? ""} />
      <InstallAppCard />
      <ul className="divide-y rounded-2xl border bg-card overflow-hidden">
        {sections.map((s) => (
          <li key={s.to}>
            <Link to={s.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition">
              <s.icon className="h-5 w-5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.label}</p>
                {s.desc && <p className="truncate text-xs text-muted-foreground">{s.desc}</p>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 space-y-2">
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