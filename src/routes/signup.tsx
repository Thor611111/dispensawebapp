import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/PasswordInput";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
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
      toast.error(error.message);
      return;
    }
    // If we have a session immediately (auto-confirm), go to onboarding.
    if (data.session) {
      navigate({ to: "/onboarding" });
      return;
    }
    // Otherwise wait for email confirmation.
    setSentEmail(email);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/onboarding" });
    if (r.error) toast.error(r.error.message ?? "Errore");
  };

  if (sentEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2">
            <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="font-bold">PantryAI</span>
          </Link>
          <h1 className="text-2xl font-bold">Controlla la tua email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Ti abbiamo inviato un link di conferma a <strong>{sentEmail}</strong>.
            Clicca il link per attivare l'account e continuare con la configurazione.
          </p>
          <Link to="/login" className="mt-6 inline-block text-sm text-primary underline">
            Vai al login
          </Link>
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
