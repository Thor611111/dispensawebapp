import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAdminUsers, setUserAdminRole } from "@/lib/admin.functions";
import { Loader2, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/utenti")({ component: Page });

function Page() {
  const fn = useServerFn(listAdminUsers);
  const setRole = useServerFn(setUserAdminRole);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => fn({}) });
  const m = useMutation({
    mutationFn: (v: { userId: string; grant: boolean }) => setRole({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Ruolo aggiornato"); },
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });
  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-xs"><tr>
          <th className="px-3 py-2 text-left">Email</th><th className="px-3 py-2 text-left">Nome</th>
          <th className="px-3 py-2 text-left">Registrato</th><th className="px-3 py-2 text-left">Admin</th><th></th>
        </tr></thead>
        <tbody>{(data as any[]).map((u) => (
          <tr key={u.id} className="border-t">
            <td className="px-3 py-2">{u.email}</td>
            <td className="px-3 py-2">{u.display_name ?? "—"}</td>
            <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("it-IT")}</td>
            <td className="px-3 py-2">{u.is_admin ? "✅" : ""}</td>
            <td className="px-3 py-2">
              <Button size="sm" variant="outline" onClick={() => m.mutate({ userId: u.id, grant: !u.is_admin })} disabled={m.isPending}>
                {u.is_admin ? <><ShieldOff className="h-3 w-3" /> Revoca</> : <><Shield className="h-3 w-3" /> Promuovi</>}
              </Button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}