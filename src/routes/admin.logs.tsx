import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listEmailLog, listPushLog, listActivityLog } from "@/lib/admin.functions";
import { useAuth } from "@/lib/auth-context";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

function LogSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 rounded-xl" />
      <div className="space-y-1.5 rounded-2xl border bg-card p-2">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 rounded-md" />)}
      </div>
    </div>
  );
}

function LogTable({ rows, columns, exportName }: { rows: any[]; columns: { key: string; label: string }[]; exportName: string }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(s));
  }, [rows, q]);
  const fmt = (k: string, v: any) =>
    k === "created_at" && v ? new Date(v).toLocaleString("it-IT") :
    typeof v === "object" && v !== null ? JSON.stringify(v) :
    String(v ?? "");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button variant="outline" size="sm" onClick={() => download(`${exportName}.csv`, toCsv(filtered))}>
          <Download className="h-3 w-3" /> CSV
        </Button>
      </div>

      {/* Mobile: card list */}
      <ul className="max-h-[58vh] space-y-2 overflow-y-auto pr-1 md:hidden">
        {filtered.length === 0 && <li className="rounded-xl border bg-card p-4 text-center text-xs text-muted-foreground">Nessun risultato</li>}
        {filtered.map((r, i) => (
          <li key={r.id ?? i} className="rounded-xl border bg-card p-3 text-[11px]">
            {columns.map((c) => {
              const v = fmt(c.key, r[c.key]);
              if (!v) return null;
              return (
                <div key={c.key} className="flex gap-2 border-b border-border/40 py-1 last:border-0">
                  <span className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">{c.label}</span>
                  <span className="min-w-0 flex-1 break-words font-medium">{v}</span>
                </div>
              );
            })}
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden max-h-[60vh] overflow-auto rounded-2xl border bg-card md:block">
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
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="activity" className="text-xs sm:text-sm">Attività</TabsTrigger>
        <TabsTrigger value="email" className="text-xs sm:text-sm">Email</TabsTrigger>
        <TabsTrigger value="push" className="text-xs sm:text-sm">Push</TabsTrigger>
      </TabsList>
      <TabsContent value="activity" className="mt-4">
        {qAct.isLoading ? <LogSkeleton /> : qAct.error ? <p className="text-destructive">{(qAct.error as any).message}</p> :
          <LogTable rows={qAct.data ?? []} exportName="admin-activity" columns={[
            { key: "created_at", label: "Data" }, { key: "source", label: "Origine" },
            { key: "level", label: "Livello" }, { key: "message", label: "Messaggio" }, { key: "metadata", label: "Metadata" },
          ]} />}
      </TabsContent>
      <TabsContent value="email" className="mt-4">
        {qEmail.isLoading ? <LogSkeleton /> : qEmail.error ? <p className="text-destructive">{(qEmail.error as any).message}</p> :
          <LogTable rows={qEmail.data ?? []} exportName="email-log" columns={[
            { key: "created_at", label: "Data" }, { key: "template_name", label: "Template" },
            { key: "recipient_email", label: "Destinatario" }, { key: "status", label: "Stato" }, { key: "error_message", label: "Errore" },
          ]} />}
      </TabsContent>
      <TabsContent value="push" className="mt-4">
        {qPush.isLoading ? <LogSkeleton /> : qPush.error ? <p className="text-destructive">{(qPush.error as any).message}</p> :
          <LogTable rows={qPush.data ?? []} exportName="push-log" columns={[
            { key: "created_at", label: "Data" }, { key: "title", label: "Titolo" },
            { key: "category", label: "Categoria" }, { key: "status", label: "Stato" }, { key: "error_message", label: "Errore" },
          ]} />}
      </TabsContent>
    </Tabs>
  );
}
