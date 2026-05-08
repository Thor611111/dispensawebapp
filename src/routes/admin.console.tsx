import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { runAdminCommand, triggerDailyNotifications } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Send, Bell, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/console")({ component: Page });

type Line = { kind: "in" | "out" | "err" | "sys"; text: string };

const QUICK = [
  { label: "Lista comandi", cmd: "help", icon: Sparkles },
];

function Page() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const run = useServerFn(runAdminCommand);
  const triggerCron = useServerFn(triggerDailyNotifications);

  const [lines, setLines] = useState<Line[]>([{ kind: "sys", text: "pantryai owner console — digita `help` per la lista dei comandi" }]);
  const [val, setVal] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [lines]);

  const m = useMutation({
    mutationFn: (cmd: string) => run({ data: { accessToken: accessToken!, command: cmd } }),
    onSuccess: (r: any) => setLines((l) => [...l, { kind: r.ok ? "out" : "err", text: r.output }]),
    onError: (e: any) => setLines((l) => [...l, { kind: "err", text: e?.message ?? "Errore" }]),
  });

  const submit = (cmd: string) => {
    if (!cmd.trim()) return;
    setLines((l) => [...l, { kind: "in", text: `pantryai> ${cmd}` }]);
    setHistory((h) => [...h, cmd]); setHIdx(-1);
    m.mutate(cmd);
    setVal("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); submit(val); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const n = hIdx < 0 ? history.length - 1 : Math.max(0, hIdx - 1);
      setHIdx(n); setVal(history[n]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx < 0) return;
      const n = hIdx + 1;
      if (n >= history.length) { setHIdx(-1); setVal(""); } else { setHIdx(n); setVal(history[n]); }
    }
  };

  const cron = useMutation({
    mutationFn: () => triggerCron({ data: { accessToken: accessToken! } }),
    onSuccess: (r: any) => { toast.success("Cron eseguito"); setLines((l) => [...l, { kind: "out", text: JSON.stringify(r) }]); },
    onError: (e: any) => toast.error(e?.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <div className="rounded-2xl border bg-zinc-950 text-zinc-100 shadow-inner">
        <div ref={scrollRef} className="h-[60vh] overflow-y-auto p-4 font-mono text-xs leading-relaxed">
          {lines.map((l, i) => (
            <pre key={i} className={
              l.kind === "in" ? "text-emerald-400" :
              l.kind === "err" ? "text-red-400 whitespace-pre-wrap" :
              l.kind === "sys" ? "text-zinc-500 italic" :
              "text-zinc-200 whitespace-pre-wrap"
            }>{l.text}</pre>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-zinc-800 p-2">
          <span className="font-mono text-xs text-emerald-400">pantryai&gt;</span>
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKey}
            placeholder="user reset-password user@example.com"
            className="border-0 bg-transparent font-mono text-xs text-zinc-100 focus-visible:ring-0"
            autoFocus
          />
          <Button size="sm" onClick={() => submit(val)} disabled={m.isPending}><Send className="h-3 w-3" /></Button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase text-muted-foreground">Comandi rapidi</h2>
        <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => cron.mutate()} disabled={cron.isPending}>
          <Bell className="h-3 w-3" /> Notifiche giornaliere
        </Button>
        {QUICK.map((q) => (
          <Button key={q.cmd} variant="outline" size="sm" className="w-full justify-start" onClick={() => submit(q.cmd)}>
            <q.icon className="h-3 w-3" /> {q.label}
          </Button>
        ))}
        <div className="rounded-xl border bg-card p-3 text-[10px] text-muted-foreground">
          <p className="font-semibold text-foreground">Suggerimenti</p>
          <p>↑ ↓ scorre lo storico</p>
          <p>`help` mostra tutti i comandi</p>
        </div>
      </div>
    </div>
  );
}
