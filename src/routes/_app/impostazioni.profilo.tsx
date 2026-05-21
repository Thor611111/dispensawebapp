import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useProfile, useHouseholdId, useMemberKind } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsPageHeader } from "@/components/SettingsPage";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/impostazioni/profilo")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: hid } = useHouseholdId();
  const { data: kind } = useMemberKind(hid);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [memberKind, setMemberKind] = useState<"adult" | "child">("adult");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile) setName(profile.display_name ?? ""); }, [profile]);
  useEffect(() => { if (kind) setMemberKind(kind); }, [kind]);

  const save = async () => {
    if (!user || !hid) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() || null }).eq("id", user.id);
    if (error) { setSaving(false); return toast.error(error.message); }
    if (memberKind !== kind) {
      const { error: e2 } = await supabase
        .from("household_members")
        .update({ member_kind: memberKind } as any)
        .eq("household_id", hid)
        .eq("user_id", user.id);
      if (e2) { setSaving(false); return toast.error(e2.message); }
      qc.invalidateQueries({ queryKey: ["memberKind", hid, user.id] });
      qc.invalidateQueries({ queryKey: ["householdMembers", hid] });
    }
    setSaving(false);
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
        <div className="space-y-2">
          <Label>Tipo utente</Label>
          <Select value={memberKind} onValueChange={(v) => setMemberKind(v as "adult" | "child")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="adult">Adulto — può modificare dispensa, spesa e piano</SelectItem>
              <SelectItem value="child">Bambino — può solo visualizzare</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Questa impostazione è visibile solo qui nel profilo.</p>
        </div>
        <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Salvataggio…" : "Salva"}</Button>
      </div>
    </div>
  );
}