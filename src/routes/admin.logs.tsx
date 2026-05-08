import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listEmailLog, listPushLog, listActivityLog } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/admin/logs")({ component: Page });

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: any) => { if (v == null) return ""; const s = typeof v === "object" ? JSON.stringify(v) : String(v); return `"${s.replace(/"/g, '""')}"`; };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function download(name: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function LogTable({ rows, columns, exportName }: { rows: any[]; columns: { key: string; label: string }[]; exportName: string }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, q]);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" size="sm" onClick={() => download(`${exportName}.csv`, toCsv(filtered))}>
          <Download className="h-3 w-3" /> CSV
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-auto rounded-2xl border bg-card">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-secondary/80"><tr>
            {columns.map((c) => <th key={c.key} className="px-2 py-1.5 text-left">{c.label}</th>)}
          </tr></thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id ?? i} className="border-t">
                {columns.map((c) => (
                  <td key={c.key} className="px-2 py-1.5 align-top">
                    {c.key === "created_at" && r[c.key] ? new Date(r[c.key]).toLocaleString("it-IT") :
                      typeof r[c.key] === "object" && r[c.key] !== null ? <pre className="max-w-xs overflow-x-auto text-[10px]">{JSON.stringify(r[c.key])}</pre> :
                      String(r[c.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} righe</p>
    </div>
  );
}

function Page() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const email = useServerFn(listEmailLog);
  const push = useServerFn(listPushLog);
  const activity = useServerFn(listActivityLog);

  const qEmail = useQuery({ queryKey: ["log-email"], enabled: !!accessToken, queryFn: () => email({ data: { accessToken: accessToken! } }) });
  const qPush = useQuery({ queryKey: ["log-push"], enabled: !!accessToken, queryFn: () => push({ data: { accessToken: accessToken! } }) });
  const qAct = useQuery({ queryKey: ["log-activity"], enabled: !!accessToken, queryFn: () => activity({ data: { accessToken: accessToken! } }) });

  return (
    <Tabs defaultValue="activity">
      <TabsList>
        <TabsTrigger value="activity">Attività admin</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="push">Push</TabsTrigger>
      </TabsList>
      <TabsContent value="activity" className="mt-4">
        {qAct.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : qAct.error ? <p className="text-destructive">{(qAct.error as any).message}</p> :
          <LogTable rows={qAct.data ?? []} exportName="admin-activity" columns={[
            { key: "created_at", label: "Data" }, { key: "source", label: "Origine" },
            { key: "level", label: "Livello" }, { key: "message", label: "Messaggio" }, { key: "metadata", label: "Metadata" },
          ]} />}
      </TabsContent>
      <TabsContent value="email" className="mt-4">
        {qEmail.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : qEmail.error ? <p className="text-destructive">{(qEmail.error as any).message}</p> :
          <LogTable rows={qEmail.data ?? []} exportName="email-log" columns={[
            { key: "created_at", label: "Data" }, { key: "template_name", label: "Template" },
            { key: "recipient_email", label: "Destinatario" }, { key: "status", label: "Stato" }, { key: "error_message", label: "Errore" },
          ]} />}
      </TabsContent>
      <TabsContent value="push" className="mt-4">
        {qPush.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : qPush.error ? <p className="text-destructive">{(qPush.error as any).message}</p> :
          <LogTable rows={qPush.data ?? []} exportName="push-log" columns={[
            { key: "created_at", label: "Data" }, { key: "title", label: "Titolo" },
            { key: "category", label: "Categoria" }, { key: "status", label: "Stato" }, { key: "error_message", label: "Errore" },
          ]} />}
      </TabsContent>
    </Tabs>
  );
}
