import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listEmailLog } from "@/lib/admin.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/log-email")({ component: Page });

function Page() {
  const fn = useServerFn(listEmailLog);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-email-log"], queryFn: () => fn({}) });
  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-secondary/50 text-xs"><tr>
          <th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Template</th>
          <th className="px-3 py-2 text-left">Destinatario</th><th className="px-3 py-2 text-left">Stato</th><th className="px-3 py-2 text-left">Errore</th>
        </tr></thead>
        <tbody>{(data as any[]).map((r) => (
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
  );
}