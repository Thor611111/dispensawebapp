import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAdminOverview, triggerDailyNotifications } from "@/lib/admin.functions";
import { Loader2, Users, Home, ChefHat, Package, ShoppingCart, Wallet, Mail, Bell, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" /> {label}</div>
      <p className="mt-2 text-2xl font-bold">{value ?? 0}</p>
    </div>
  );
}

function AdminOverview() {
  const fn = useServerFn(getAdminOverview);
  const trigger = useServerFn(triggerDailyNotifications);
  const { data, isLoading } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn({}) });
  const m = useMutation({
    mutationFn: () => trigger({}),
    onSuccess: (r: any) => toast.success(`Inviati ${r?.sent ?? 0} digest`),
    onError: (e: any) => toast.error(e?.message ?? "Errore"),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  const d: any = data ?? {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Users} label="Utenti" value={d.users} />
        <Stat icon={Home} label="Household" value={d.households} />
        <Stat icon={ChefHat} label="Ricette" value={d.recipes} />
        <Stat icon={Package} label="Alimenti" value={d.food_items} />
        <Stat icon={ShoppingCart} label="Spesa attiva" value={d.shopping_items} />
        <Stat icon={Wallet} label={`Spese mese €`} value={Number(d.expenses_month ?? 0).toFixed(2)} />
        <Stat icon={Mail} label="Email 7gg" value={d.emails_7d} />
        <Stat icon={Bell} label="Push 7gg" value={d.push_7d} />
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