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
import { AlertCircle, MailCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

type SignupState =
  | { kind: "idle" }
  | { kind: "already_registered"; email: string }
  | { kind: "weak_password" }
  | { kind: "invalid_email" }
  | { kind: "rate_limited" }
  | { kind: "network" }
  | { kind: "generic"; message: string };

function mapSignupError(message: string, email: string): SignupState {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return { kind: "already_registered", email };
  }
  if (m.includes("password") && (m.includes("weak") || m.includes("short") || m.includes("least") || m.includes("characters"))) {
    return { kind: "weak_password" };
  }
  if (m.includes("invalid email") || m.includes("invalid format") || m.includes("email address")) {
    return { kind: "invalid_email" };
  }
  if (m.includes("rate limit") || m.includes("too many")) return { kind: "rate_limited" };
  if (m.includes("failed to fetch") || m.includes("network")) return { kind: "network" };
  return { kind: "generic", message };
}

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [state, setState] = useState<SignupState>({ kind: "idle" });
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/home" });
  }, [authLoading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ kind: "idle" });
    if (password.length < 6) {
      setState({ kind: "weak_password" });
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Le password non coincidono");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + "/onboarding",
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) {
      setState(mapSignupError(error.message, email));
      return;
    }
    // Supabase returns a user with empty identities array when email already exists
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setState({ kind: "already_registered", email });
      return;
    }
    try { localStorage.setItem("pantryai:last_email", email); } catch {}
    if (data.session) {
      navigate({ to: "/onboarding" });
      return;
    }
    setSentEmail(email);
  };

  const resendConfirmation = async (targetEmail: string) => {
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: { emailRedirectTo: window.location.origin + "/onboarding" },
    });
    setResending(false);
    if (error) return toast.error(error.message);
    toast.success("Email di conferma inviata. Controlla la casella.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/onboarding" });
    if (r.error) toast.error(r.error.message ?? "Errore");
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sentEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-bold">PantryAI</span>
          </Link>
          <MailCheck className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-bold">Controlla la tua email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Ti abbiamo inviato un link di conferma a <strong>{sentEmail}</strong>.
            Clicca il link per attivare l'account e continuare con la configurazione.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={() => resendConfirmation(sentEmail)} disabled={resending}>
              {resending ? "Invio…" : "Non è arrivata? Rinvia"}
            </Button>
            <Link to="/login" className="text-sm text-primary underline">Vai al login</Link>
          </div>
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
        <h1 className="text-2xl font-bold">Crea il tuo account</h1>
        <p className="mt-1 text-sm text-muted-foreground">Bastano pochi secondi.</p>

        <Button type="button" variant="outline" className="mt-6 w-full" onClick={google}>
          Continua con Google
        </Button>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> oppure <div className="h-px flex-1 bg-border" />
        </div>

        {state.kind === "already_registered" && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Email già registrata</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Esiste già un account con <strong>{state.email}</strong>.</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/login" className="text-primary underline text-sm">Vai al login</Link>
                <span className="text-muted-foreground text-sm">·</span>
                <button type="button" className="text-primary underline text-sm" onClick={() => resendConfirmation(state.email)} disabled={resending}>
                  {resending ? "Invio…" : "Rinvia email di conferma"}
                </button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {state.kind === "weak_password" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Password troppo debole</AlertTitle>
            <AlertDescription>Usa almeno 6 caratteri.</AlertDescription>
          </Alert>
        )}
        {state.kind === "invalid_email" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Email non valida</AlertTitle>
            <AlertDescription>Controlla il formato dell'email inserita.</AlertDescription>
          </Alert>
        )}
        {state.kind === "rate_limited" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Troppi tentativi</AlertTitle>
            <AlertDescription>Attendi qualche minuto prima di riprovare.</AlertDescription>
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
            <Label htmlFor="name">Come ti chiami?</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Conferma password</Label>
            <PasswordInput id="confirmPassword" required minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creazione…" : "Crea account"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Hai già un account? <Link to="/login" className="text-primary underline">Accedi</Link>
        </p>
      </div>
    </div>
  );
}
