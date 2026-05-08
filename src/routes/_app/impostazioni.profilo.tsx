import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsPageHeader } from "@/components/SettingsPage";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/impostazioni/profilo")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile) setName(profile.display_name ?? ""); }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() || null }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Profilo aggiornato");
  };

  return (
    <div>
      <SettingsPageHeader title="Profilo" subtitle="Come vuoi essere chiamato" />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Il tuo nome" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled />
        </div>
        <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Salvataggio…" : "Salva"}</Button>
      </div>
    </div>
  );
}