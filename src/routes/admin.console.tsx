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
      {/* Quick commands first on mobile so terminal stays anchored to keyboard */}
      <div className="order-2 space-y-2 lg:order-2">
        <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Comandi rapidi</h2>
        <div className="flex flex-wrap gap-2 lg:flex-col">
          <Button variant="outline" size="sm" className="flex-1 justify-start lg:w-full" onClick={() => cron.mutate()} disabled={cron.isPending}>
            <Bell className="h-3 w-3" /> Notifiche
          </Button>
          {QUICK.map((q) => (
            <Button key={q.cmd} variant="outline" size="sm" className="flex-1 justify-start lg:w-full" onClick={() => submit(q.cmd)}>
              <q.icon className="h-3 w-3" /> {q.label}
            </Button>
          ))}
        </div>
        <div className="rounded-xl border bg-card p-3 text-[10px] text-muted-foreground">
          <p className="font-semibold text-foreground">Suggerimenti</p>
          <p>↑ ↓ scorre lo storico</p>
          <p>`help` mostra tutti i comandi</p>
        </div>
      </div>

      <div className="order-1 overflow-hidden rounded-2xl border bg-zinc-950 text-zinc-100 shadow-inner lg:order-1">
        <div ref={scrollRef} className="h-[55vh] overflow-y-auto overflow-x-hidden p-3 font-mono text-[11px] leading-relaxed sm:p-4 sm:text-xs">
          {lines.map((l, i) => (
            <pre key={i} className={
              "whitespace-pre-wrap break-words " + (
                l.kind === "in" ? "text-emerald-400" :
                l.kind === "err" ? "text-red-400" :
                l.kind === "sys" ? "text-zinc-500 italic" :
                "text-zinc-200"
              )
            }>{l.text}</pre>
          ))}
          {m.isPending && <p className="text-zinc-500 italic">esecuzione in corso…</p>}
        </div>
        <div className="flex items-center gap-1.5 border-t border-zinc-800 p-2">
          <span className="shrink-0 font-mono text-[11px] text-emerald-400">$</span>
          <Input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={onKey}
            placeholder="es. help"
            className="h-9 min-w-0 flex-1 rounded-md border-0 bg-transparent px-1 font-mono text-[12px] text-zinc-100 shadow-none placeholder:text-zinc-600 focus-visible:ring-0"
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button size="sm" className="h-9 shrink-0 px-3" onClick={() => submit(val)} disabled={m.isPending}><Send className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}
