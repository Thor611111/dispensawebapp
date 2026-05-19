import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHouseholdId } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { SettingsPageHeader } from "@/components/SettingsPage";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Bell, BellOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getVapidPublicKey, savePushSubscription, removePushSubscription } from "@/lib/push.functions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function bufToBase64(buf: ArrayBuffer | null) {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const Route = createFileRoute("/_app/impostazioni/notifiche")({ component: Page });

function Page() {
  const { data: hid } = useHouseholdId();
  const qc = useQueryClient();
  const { data: prefs } = useQuery({
    queryKey: ["notif-prefs", hid],
    enabled: !!hid,
    queryFn: async () => {
      const { data } = await supabase.from("notification_preferences").select("*").eq("household_id", hid!).maybeSingle();
      return data;
    },
  });

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [expiry, setExpiry] = useState(true);
  const [shopping, setShopping] = useState(true);
  const [weekly, setWeekly] = useState(true);
  const [hour, setHour] = useState(9);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const fetchVapid = useServerFn(getVapidPublicKey);
  const saveSub = useServerFn(savePushSubscription);
  const removeSub = useServerFn(removePushSubscription);

  useEffect(() => {
    if (prefs) {
      setEmailEnabled(prefs.email_enabled);
      setPushEnabled(prefs.push_enabled);
      setExpiry(prefs.expiry_alerts);
      setShopping(prefs.shopping_reminders);
      setWeekly(prefs.weekly_plan_reminders);
      setHour(prefs.daily_send_hour);
    }
  }, [prefs]);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;
    setPushSupported(supported);
    if (!supported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  const enablePush = async () => {
    if (!pushSupported) return toast.error("Push non supportato su questo dispositivo");
    setPushLoading(true);
    try {
      const { key } = await fetchVapid({});
      if (!key) {
        toast.error("Push non configurate dall'amministratore (manca chiave VAPID)");
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast.error("Permesso negato"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const raw = sub.toJSON() as any;
      await saveSub({
        data: {
          endpoint: sub.endpoint,
          p256dh: raw.keys?.p256dh ?? bufToBase64(sub.getKey("p256dh")),
          auth: raw.keys?.auth ?? bufToBase64(sub.getKey("auth")),
          household_id: hid ?? null,
          user_agent: navigator.userAgent,
        },
      });
      setPushSubscribed(true);
      toast.success("Notifiche push attive su questo dispositivo");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Impossibile attivare le push");
    } finally {
      setPushLoading(false);
    }
  };

  const disablePush = async () => {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removeSub({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
      setPushSubscribed(false);
      toast.success("Push disattivate");
    } catch (e: any) {
      toast.error(e?.message ?? "Errore");
    } finally {
      setPushLoading(false);
    }
  };

  const save = async () => {
    if (!hid) return;
    const { error } = await supabase.from("notification_preferences").upsert({
      household_id: hid,
      email_enabled: emailEnabled,
      push_enabled: pushEnabled,
      expiry_alerts: expiry,
      shopping_reminders: shopping,
      weekly_plan_reminders: weekly,
      daily_send_hour: hour,
    });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notif-prefs", hid] });
    toast.success("Salvato");
  };

  return (
    <div>
      <SettingsPageHeader title="Notifiche" subtitle="Promemoria scadenze, spesa e piano pasti" />
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifiche push</p>
              <p className="text-xs text-muted-foreground">{pushSupported ? (pushSubscribed ? "Attive su questo dispositivo" : "Non attive") : "Non supportato"}</p>
            </div>
            {pushSupported && !pushSubscribed && (
              <Button size="sm" onClick={enablePush} disabled={pushLoading}>
                <Bell className="h-4 w-4" /> Attiva
              </Button>
            )}
            {pushSupported && pushSubscribed && (
              <Button size="sm" variant="outline" onClick={disablePush} disabled={pushLoading}>
                <BellOff className="h-4 w-4" /> Disattiva
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between"><Label>Email</Label><Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} /></div>
          <div className="flex items-center justify-between"><Label>Push</Label><Switch checked={pushEnabled} onCheckedChange={setPushEnabled} /></div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-4">
          <p className="text-sm font-semibold">Categorie</p>
          <div className="flex items-center justify-between"><Label>Avvisi scadenze</Label><Switch checked={expiry} onCheckedChange={setExpiry} /></div>
          <div className="flex items-center justify-between"><Label>Promemoria spesa</Label><Switch checked={shopping} onCheckedChange={setShopping} /></div>
          <div className="flex items-center justify-between"><Label>Piano settimanale</Label><Switch checked={weekly} onCheckedChange={setWeekly} /></div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2">
          <Label>Ora di invio quotidiano</Label>
          <Input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground">Le notifiche giornaliere arrivano intorno a questa ora.</p>
        </div>

        <Button className="w-full" onClick={save}>Salva</Button>
      </div>
    </div>
  );
}