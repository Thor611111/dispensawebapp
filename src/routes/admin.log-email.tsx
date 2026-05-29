import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listEmailLog } from "@/lib/admin.functions";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/log-email")({ component: Page });

function Page() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const fn = useServerFn(listEmailLog);
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["admin-email-log"],
    enabled: !!accessToken,
    queryFn: () => fn({ data: { accessToken: accessToken! } }),
  });
  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (error) return <div className="rounded-2xl border bg-card p-4 text-sm text-destructive">{error.message}</div>;
  const rows = data as any[];
  return (
    <div className="space-y-2">
      {/* Mobile: card list */}
      <ul className="space-y-2 md:hidden">
        {rows.length === 0 && <li className="rounded-xl border bg-card p-4 text-center text-xs text-muted-foreground">Nessuna email registrata</li>}
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border bg-card p-3 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-semibold">{r.template_name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${r.status === "sent" ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}`}>{r.status}</span>
            </div>
            <p className="mt-1 truncate text-muted-foreground">{r.recipient_email}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("it-IT")}</p>
            {r.error_message && <p className="mt-1 break-words text-[10px] text-destructive">{r.error_message}</p>}
          </li>
        ))}
      </ul>
      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs"><tr>
            <th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Template</th>
            <th className="px-3 py-2 text-left">Destinatario</th><th className="px-3 py-2 text-left">Stato</th><th className="px-3 py-2 text-left">Errore</th>
          </tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2 text-xs">{new Date(r.created_at).toLocaleString("it-IT")}</td>
              <td className="px-3 py-2 text-xs">{r.template_name}</td>
              <td className="px-3 py-2 text-xs">{r.recipient_email}</td>
              <td className="px-3 py-2 text-xs">{r.status}</td>
              <td className="px-3 py-2 text-xs text-destructive">{r.error_message ?? ""}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}