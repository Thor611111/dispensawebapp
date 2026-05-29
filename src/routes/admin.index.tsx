import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAdminOverview, triggerDailyNotifications } from "@/lib/admin.functions";
import { Loader2, Users, Home, Mail, Bell, Send, Activity, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

function Stat({ icon: Icon, label, value, tone = "default" }: { icon: any; label: string; value: any; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <p className={`mt-2 text-2xl font-bold ${tone === "warn" && Number(value) > 0 ? "text-destructive" : ""}`}>{value ?? 0}</p>
    </div>
  );
}

function AdminOverview() {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const fn = useServerFn(getAdminOverview);
  const trigger = useServerFn(triggerDailyNotifications);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    enabled: !!accessToken,
    queryFn: () => fn({ data: { accessToken: accessToken! } }),
  });
  const m = useMutation({
    mutationFn: () => {
      if (!accessToken) throw new Error("Sessione non disponibile");
      return trigger({ data: { accessToken } });
    },
    onSuccess: (r: any) => toast.success(`Inviati ${r?.sent ?? 0} digest`),
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });

  if (isLoading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
  if (error) return <div className="rounded-2xl border bg-card p-4 text-sm text-destructive">{error.message}</div>;
  const d: any = data ?? {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Utenti totali" value={d.users} />
        <Stat icon={Users} label="Nuovi 7gg" value={d.users_7d} />
        <Stat icon={Home} label="Household" value={d.households} />
        <Stat icon={Mail} label="Email 7gg" value={d.emails_7d} />
        <Stat icon={Bell} label="Push 7gg" value={d.push_7d} />
        <Stat icon={AlertTriangle} label="Email fallite 24h" value={d.emails_failed_24h} tone="warn" />
        <Stat icon={AlertTriangle} label="Push fallite 24h" value={d.push_failed_24h} tone="warn" />
        <Stat icon={Activity} label="Azioni admin 24h" value={d.admin_actions_24h} />
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Notifiche giornaliere</h2>
        <p className="mt-1 text-xs text-muted-foreground">Il cron viene eseguito ogni ora e invia il digest agli utenti la cui ora preferita coincide.</p>
        <Button size="sm" className="mt-3" onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Esegui adesso
        </Button>
      </div>
    </div>
  );
}
