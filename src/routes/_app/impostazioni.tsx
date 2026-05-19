import { createFileRoute, Outlet, useLocation, useNavigate, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useHouseholdId, usePreferences, useExpenses, useProfile, useIsOwner } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Trash2, User, Bell, Utensils, Clock, Home as HomeIcon, ChevronRight, KeyRound, ShieldCheck, Sun, Moon, Monitor, Palette } from "lucide-react";
import { InstallAppCard } from "@/components/InstallAppCard";
import { useTheme } from "@/lib/theme";
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
  const { data: isOwner } = useIsOwner();
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
    ...(isOwner ? [{ to: "/admin" as const, label: "Owner Console", desc: "Gestione app", icon: ShieldCheck }] : []),
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
      <ThemeCard />
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

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const options = [
    { v: "light" as const, l: "Chiaro", Icon: Sun },
    { v: "dark" as const, l: "Scuro", Icon: Moon },
    { v: "system" as const, l: "Sistema", Icon: Monitor },
  ];
  return (
    <div className="mb-3 rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Palette className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Aspetto</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(({ v, l, Icon }) => (
          <button
            key={v}
            type="button"
            onClick={() => setTheme(v)}
            className={
              "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition " +
              (theme === v
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background hover:bg-secondary/40 text-muted-foreground")
            }
          >
            <Icon className="h-4 w-4" />
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}