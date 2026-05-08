import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useHouseholdId } from "@/lib/queries";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsPageHeader } from "@/components/SettingsPage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, UserPlus, Users, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/impostazioni/casa")({ component: Page });

function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

function Page() {
  const { data: hid } = useHouseholdId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["members", hid],
    enabled: !!hid,
    queryFn: async () => {
      const { data } = await supabase.from("household_members").select("*").eq("household_id", hid!);
      if (!data?.length) return [];
      const ids = data.map((m) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id,display_name").in("id", ids);
      return data.map((m) => ({ ...m, display_name: profs?.find((p) => p.id === m.user_id)?.display_name }));
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["invites", hid],
    enabled: !!hid,
    queryFn: async () => {
      const { data } = await supabase.from("household_invites").select("*").eq("household_id", hid!).is("used_at", null).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createInvite = async () => {
    if (!hid || !user) return;
    setCreating(true);
    const code = genCode();
    const { error } = await supabase.from("household_invites").insert({ household_id: hid, code, created_by: user.id });
    setCreating(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["invites", hid] });
    toast.success(`Codice ${code} creato`);
  };

  const copy = (code: string) => { navigator.clipboard.writeText(code); toast.success("Codice copiato"); };

  const join = async () => {
    if (!joinCode.trim()) return;
    const { data, error } = await supabase.rpc("accept_household_invite", { _code: joinCode.trim().toUpperCase() });
    if (error) return toast.error(error.message);
    setJoinCode("");
    qc.invalidateQueries();
    toast.success("Sei nella casa!");
  };

  const leave = async (uid: string) => {
    if (!hid) return;
    const { error } = await supabase.from("household_members").delete().eq("household_id", hid).eq("user_id", uid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["members", hid] });
  };

  return (
    <div>
      <SettingsPageHeader title="Casa & membri" subtitle="Condividi dispensa, piano e spesa" />

      <div className="space-y-5">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4" /> Membri</div>
          {members.length === 0 ? <p className="text-xs text-muted-foreground">Nessun membro.</p> : (
            <ul className="space-y-2">
              {members.map((m: any) => (
                <li key={m.user_id} className="flex items-center justify-between rounded-lg bg-secondary/30 p-2">
                  <div className="text-sm">
                    <p className="font-medium">{m.display_name ?? m.user_id.slice(0, 8)}{m.user_id === user?.id ? " (tu)" : ""}</p>
                    <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
                  </div>
                  {m.role !== "owner" && m.user_id !== user?.id && (
                    <Button size="icon" variant="ghost" onClick={() => leave(m.user_id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Invita qualcuno</p>
          <p className="text-xs text-muted-foreground">Genera un codice da condividere. Chi lo usa entrerà nella tua casa.</p>
          <Button onClick={createInvite} disabled={creating} className="w-full"><UserPlus className="h-4 w-4" /> Genera codice invito</Button>
          {invites.length > 0 && (
            <ul className="space-y-2">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between rounded-lg bg-secondary/30 p-2">
                  <span className="font-mono text-base font-bold">{i.code}</span>
                  <Button size="sm" variant="ghost" onClick={() => copy(i.code)}><Copy className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Unisciti a una casa</p>
          <div className="flex gap-2">
            <Input placeholder="CODICE" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} className="font-mono" />
            <Button onClick={join}>Entra</Button>
          </div>
          <p className="text-xs text-muted-foreground">Oppure apri un link <Link to="/" className="underline">/join/CODICE</Link></p>
        </div>
      </div>
    </div>
  );
}