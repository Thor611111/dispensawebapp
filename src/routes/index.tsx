import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Package, ChefHat, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <img src="/icon-192.png" alt="PantryAI" className="h-9 w-9 rounded-lg" />
          <span className="text-lg font-bold">PantryAI</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Accedi</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">Inizia gratis</Link>
          </Button>
        </div>
      </header>
      <main>
        <section className="mx-auto max-w-3xl px-6 pb-12 pt-10 text-center sm:pt-20">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Assistente alimentare intelligente
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            La tua dispensa, le tue ricette, il tuo budget.
            <span className="text-primary"> In automatico.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
            PantryAI sa cosa hai in casa, ti suggerisce cosa cucinare, pianifica la settimana
            e prepara la lista della spesa. Tu pensi solo a mangiare bene.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/signup">Inizia gratis</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link to="/login">Ho già un account</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Package, title: "Dispensa smart", text: "Inserisci con foto o testo. Scadenze in evidenza." },
            { icon: ChefHat, title: "Cosa cucino?", text: "Ricette su misura con ciò che hai già." },
            { icon: Sparkles, title: "Piano settimanale", text: "Il menu della settimana generato in un tap." },
            { icon: Wallet, title: "Budget reale", text: "Risparmia senza pensarci. Spese sotto controllo." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PantryAI
      </footer>
    </div>
  );
}
