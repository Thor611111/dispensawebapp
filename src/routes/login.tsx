import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, MailCheck, MailWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type AuthState =
  | { kind: "idle" }
  | { kind: "invalid_credentials" }
  | { kind: "email_not_confirmed"; email: string }
  | { kind: "rate_limited" }
  | { kind: "network" }
  | { kind: "generic"; message: string };

function mapLoginError(message: string, email: string): AuthState {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("email_not_confirmed") || m.includes("not confirmed")) {
    return { kind: "email_not_confirmed", email };
  }
  if (m.includes("invalid login") || m.includes("invalid_credentials") || m.includes("invalid grant")) {
    return { kind: "invalid_credentials" };
  }
  if (m.includes("rate limit") || m.includes("too many")) return { kind: "rate_limited" };
  if (m.includes("failed to fetch") || m.includes("network")) return { kind: "network" };
  return { kind: "generic", message };
}

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<AuthState>({ kind: "idle" });
  const [resending, setResending] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Auto-redirect if already authenticated (session restored from storage)
  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/home" });
    }
  }, [authLoading, user, navigate]);

  // Prefill last used email
  useEffect(() => {
    try {
      const last = localStorage.getItem("pantryai:last_email");
      if (last) setEmail(last);
    } catch {}
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "idle" });
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setState(mapLoginError(error.message, email));
      return;
    }
    try { localStorage.setItem("pantryai:last_email", email); } catch {}
    navigate({ to: "/home" });
  };

  const resendConfirmation = async () => {
    if (state.kind !== "email_not_confirmed") return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: state.email,
      options: { emailRedirectTo: window.location.origin + "/onboarding" },
    });
    setResending(false);
    if (error) return toast.error(error.message);
    toast.success("Email di conferma inviata di nuovo. Controlla la tua casella.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/home" });
    if (r.error) toast.error(r.error.message ?? "Errore di accesso");
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + "/reset-password",
    });
    setResetLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Ti abbiamo inviato un'email con il link per reimpostare la password.");
    setShowReset(false);
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showReset) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold">Recupera password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Inserisci la tua email, ti invieremo un link per reimpostarla.</p>
          <form onSubmit={sendReset} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email</Label>
              <Input id="reset-email" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? "Invio…" : "Invia link di recupero"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setShowReset(false)}>
              Annulla
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-bold">PantryAI</span>
        </Link>
        <h1 className="text-2xl font-bold">Bentornato</h1>
        <p className="mt-1 text-sm text-muted-foreground">Accedi per continuare</p>

        <Button type="button" variant="outline" className="mt-6 w-full" onClick={google}>
          Continua con Google
        </Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> oppure <div className="h-px flex-1 bg-border" />
        </div>

        {state.kind === "invalid_credentials" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Credenziali non valide</AlertTitle>
            <AlertDescription>
              Email o password errati. Controlla i dati o{" "}
              <button type="button" className="underline" onClick={() => { setResetEmail(email); setShowReset(true); }}>
                reimposta la password
              </button>.
            </AlertDescription>
          </Alert>
        )}
        {state.kind === "email_not_confirmed" && (
          <Alert className="mb-4">
            <MailWarning className="h-4 w-4" />
            <AlertTitle>Email non ancora confermata</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Verifica l'email <strong>{state.email}</strong> per attivare l'account.</p>
              <Button type="button" size="sm" variant="outline" onClick={resendConfirmation} disabled={resending}>
                {resending ? "Invio…" : "Reinvia email di conferma"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {state.kind === "rate_limited" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Troppi tentativi</AlertTitle>
            <AlertDescription>Hai effettuato troppi tentativi. Riprova tra qualche minuto.</AlertDescription>
          </Alert>
        )}
        {state.kind === "network" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Problema di connessione</AlertTitle>
            <AlertDescription>Controlla la tua connessione internet e riprova.</AlertDescription>
          </Alert>
        )}
        {state.kind === "generic" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errore</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Resterai connesso su questo dispositivo</span>
            <button type="button" onClick={() => { setResetEmail(email); setShowReset(true); }} className="text-primary underline">
              Password dimenticata?
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Accesso…" : "Accedi"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Non hai un account? <Link to="/signup" className="text-primary underline">Registrati</Link>
        </p>
      </div>
    </div>
  );
}
