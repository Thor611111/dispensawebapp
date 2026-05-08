import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { SettingsPageHeader } from "@/components/SettingsPage";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/impostazioni/sicurezza")({ component: Page });

function Page() {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const change = async () => {
    if (pwd.length < 6) return toast.error("Almeno 6 caratteri");
    if (pwd !== confirm) return toast.error("Le password non coincidono");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) return toast.error(error.message);
    setPwd(""); setConfirm("");
    toast.success("Password aggiornata");
  };
  return (
    <div>
      <SettingsPageHeader title="Password e sicurezza" />
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nuova password</Label><PasswordInput value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
        <div className="space-y-2"><Label>Conferma password</Label><PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        <Button className="w-full" disabled={loading} onClick={change}>{loading ? "Aggiornamento…" : "Aggiorna password"}</Button>
      </div>
    </div>
  );
}