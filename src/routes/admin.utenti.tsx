import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listAdminUsers, setUserAdminRole,
  adminResetPassword, adminUpdateUserEmail, adminUpdateUserName, adminDeleteUser, adminImpersonate,
} from "@/lib/admin.functions";
import { Loader2, KeyRound, Mail as MailIcon, User as UserIcon, Trash2, UserCheck, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/utenti")({ component: Page });

type Action = null | { kind: "email" | "name"; user: any } | { kind: "delete" | "reset"; user: any } | { kind: "impersonate"; url: string };

function Page() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const qc = useQueryClient();
  const list = useServerFn(listAdminUsers);
  const setRole = useServerFn(setUserAdminRole);
  const reset = useServerFn(adminResetPassword);
  const setEmail = useServerFn(adminUpdateUserEmail);
  const setName = useServerFn(adminUpdateUserName);
  const del = useServerFn(adminDeleteUser);
  const impersonate = useServerFn(adminImpersonate);

  const [filter, setFilter] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [val, setVal] = useState("");

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    enabled: !!accessToken,
    queryFn: () => list({ data: { accessToken: accessToken! } }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-users"] });
  const wrap = <T,>(p: Promise<T>, ok: string) => p.then(() => { toast.success(ok); refresh(); }).catch((e) => toast.error(e?.message ?? "Errore"));

  const mRole = useMutation({ mutationFn: (v: { userId: string; grant: boolean }) => setRole({ data: { ...v, accessToken: accessToken! } }), onSuccess: () => { refresh(); toast.success("Ruolo aggiornato"); }, onError: (e: any) => toast.error(e?.message) });

  if (isLoading) return (
    <div className="space-y-2">
      <Skeleton className="h-12 rounded-xl" />
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
    </div>
  );
  if (error) return <div className="rounded-2xl border bg-card p-4 text-sm text-destructive">{error.message}</div>;

  const rows = (data as any[]).filter((u) => !filter || u.email?.toLowerCase().includes(filter.toLowerCase()) || u.display_name?.toLowerCase().includes(filter.toLowerCase()));

  const Actions = ({ u }: { u: any }) => (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Reset password" onClick={() => setAction({ kind: "reset", user: u })}>
        <KeyRound className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Cambia email" onClick={() => { setVal(u.email); setAction({ kind: "email", user: u }); }}>
        <MailIcon className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Cambia nome" onClick={() => { setVal(u.display_name ?? ""); setAction({ kind: "name", user: u }); }}>
        <UserIcon className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" title="Impersonifica" onClick={async () => {
        try {
          const r: any = await impersonate({ data: { accessToken: accessToken!, userId: u.id } });
          setAction({ kind: "impersonate", url: r.url });
        } catch (e: any) { toast.error(e?.message); }
      }}>
        <UserCheck className="h-4 w-4" />
      </Button>
      {!u.is_owner && (
        <Button size="icon" variant="ghost" className="h-8 w-8" title={u.is_admin ? "Revoca admin" : "Promuovi admin"} onClick={() => mRole.mutate({ userId: u.id, grant: !u.is_admin })}>
          {u.is_admin ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
        </Button>
      )}
      {!u.is_owner && (
        <Button size="icon" variant="ghost" className="h-8 w-8" title="Elimina account" onClick={() => setAction({ kind: "delete", user: u })}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <Input placeholder="Filtra per email o nome…" value={filter} onChange={(e) => setFilter(e.target.value)} />

      {/* Mobile card view */}
      <ul className="space-y-2 md:hidden">
        {rows.map((u) => (
          <li key={u.id} className="rounded-xl border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.display_name ?? "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Reg. {new Date(u.created_at).toLocaleDateString("it-IT")}
                  {u.last_sign_in_at ? ` · Login ${new Date(u.last_sign_in_at).toLocaleDateString("it-IT")}` : ""}
                </p>
                {(u.is_owner || u.is_admin) && <p className="mt-1 text-[11px]">{u.is_owner ? "👑 Owner" : "🛡 Admin"}</p>}
              </div>
            </div>
            <div className="mt-2 border-t pt-2"><Actions u={u} /></div>
          </li>
        ))}
      </ul>

      {/* Desktop table view */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-secondary/50 text-xs"><tr>
            <th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Nome</th>
            <th className="px-3 py-2 text-left">Registrato</th><th className="px-3 py-2 text-left">Ultimo login</th>
            <th className="px-3 py-2 text-left">Ruolo</th><th></th>
          </tr></thead>
          <tbody>{rows.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-3 py-2">{u.email}</td>
              <td className="px-3 py-2">{u.display_name ?? "—"}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("it-IT")}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString("it-IT") : "—"}</td>
              <td className="px-3 py-2 text-xs">{u.is_owner ? "👑 Owner" : u.is_admin ? "🛡 Admin" : ""}</td>
              <td className="px-3 py-2 text-right"><Actions u={u} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <Dialog open={action?.kind === "email" || action?.kind === "name"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action?.kind === "email" ? "Cambia email" : "Cambia nome"}</DialogTitle>
            <DialogDescription>{action && "user" in action ? action.user.email : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{action?.kind === "email" ? "Nuova email" : "Nuovo nome"}</Label>
            <Input value={val} onChange={(e) => setVal(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>Annulla</Button>
            <Button onClick={async () => {
              if (!action || !("user" in action)) return;
              try {
                if (action.kind === "email") await setEmail({ data: { accessToken: accessToken!, userId: action.user.id, email: val } });
                else await setName({ data: { accessToken: accessToken!, userId: action.user.id, name: val } });
                toast.success("Aggiornato"); refresh(); setAction(null);
              } catch (e: any) { toast.error(e?.message); }
            }}>Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={action?.kind === "delete"} onOpenChange={(o) => !o && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {action?.kind === "delete" ? action.user.email : ""}?</AlertDialogTitle>
            <AlertDialogDescription>Questa azione è irreversibile e cancella tutti i dati dell'utente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (action?.kind !== "delete") return;
              try { await del({ data: { accessToken: accessToken!, userId: action.user.id } }); toast.success("Eliminato"); refresh(); setAction(null); }
              catch (e: any) { toast.error(e?.message); }
            }}>Elimina per sempre</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={action?.kind === "reset"} onOpenChange={(o) => !o && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inviare email di reset password?</AlertDialogTitle>
            <AlertDialogDescription>L'utente {action?.kind === "reset" ? action.user.email : ""} riceverà un link per reimpostare la password.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (action?.kind !== "reset") return;
              await wrap(reset({ data: { accessToken: accessToken!, email: action.user.email } }), "Email di recupero inviata");
              setAction(null);
            }}>Invia</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={action?.kind === "impersonate"} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link di impersonificazione</DialogTitle>
            <DialogDescription>Apri questo link in una finestra in incognito per non perdere la sessione owner.</DialogDescription>
          </DialogHeader>
          <textarea readOnly className="h-32 w-full break-all rounded border bg-muted p-2 font-mono text-[10px]" value={action?.kind === "impersonate" ? action.url : ""} />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setAction(null)}>Chiudi</Button>
            <Button onClick={() => { if (action?.kind === "impersonate") { navigator.clipboard.writeText(action.url); toast.success("Copiato"); } }}>Copia link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
