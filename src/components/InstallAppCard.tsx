import { useState } from "react";
import { Download, Share, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

type Props = {
  variant?: "banner" | "card" | "inline";
  dismissible?: boolean;
};

export function InstallAppCard({ variant = "card", dismissible = false }: Props) {
  const { canInstall, isIOS, isInstalled, dismissed, promptInstall, dismiss } = useInstallPrompt();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (isInstalled) return null;
  if (dismissible && dismissed) return null;
  if (!canInstall && !isIOS) return null;

  const handleInstall = async () => {
    if (canInstall) {
      await promptInstall();
    } else if (isIOS) {
      setShowIosHelp((s) => !s);
    }
  };

  if (variant === "inline") {
    return (
      <Button variant="outline" size="sm" onClick={handleInstall}>
        <Download className="h-4 w-4" /> Installa app
      </Button>
    );
  }

  return (
    <div className="relative mb-4 rounded-2xl border bg-card p-4">
      {dismissible && (
        <button
          onClick={dismiss}
          aria-label="Chiudi"
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold">Installa PantryAI</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aggiungila alla schermata Home per aprirla come una vera app.
          </p>
          <div className="mt-3">
            <Button size="sm" onClick={handleInstall}>
              <Download className="h-4 w-4" />
              {canInstall ? "Installa app" : "Come si fa su iPhone?"}
            </Button>
          </div>
          {isIOS && showIosHelp && (
            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-foreground">
              <p className="mb-2 font-medium">Su iPhone / iPad (Safari):</p>
              <ol className="ml-1 space-y-1.5">
                <li className="flex items-center gap-2">
                  1. Tocca <Share className="inline h-3.5 w-3.5" /> <span>Condividi</span>
                </li>
                <li className="flex items-center gap-2">
                  2. Scegli <Plus className="inline h-3.5 w-3.5" /> <span>Aggiungi alla schermata Home</span>
                </li>
                <li>3. Conferma con "Aggiungi"</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}