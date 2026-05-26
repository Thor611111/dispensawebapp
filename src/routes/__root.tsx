import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#4a8a5e" },
      { title: "PantryAI" },
      { name: "description", content: "Gestisci dispensa, suggerisci ricette, pianifica i pasti e tieni sotto controllo la spesa." },
      { property: "og:title", content: "PantryAI" },
      { property: "og:description", content: "Gestisci dispensa, suggerisci ricette, pianifica i pasti e tieni sotto controllo la spesa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "PantryAI" },
      { name: "twitter:description", content: "Gestisci dispensa, suggerisci ricette, pianifica i pasti e tieni sotto controllo la spesa." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/70915e18-42cd-4300-843b-aec6b960c802/id-preview-acba3499--30cdf66c-7516-40c8-aa07-54c7f7aae181.lovable.app-1778159338463.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/70915e18-42cd-4300-843b-aec6b960c802/id-preview-acba3499--30cdf66c-7516-40c8-aa07-54c7f7aae181.lovable.app-1778159338463.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icon-192.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pantryai-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d){r.classList.add('dark');r.style.colorScheme='dark'}else{r.style.colorScheme='light'}var A={salvia:['oklch(0.55 0.09 150)','oklch(0.7 0.12 150)'],terracotta:['oklch(0.65 0.17 40)','oklch(0.72 0.17 45)'],oceano:['oklch(0.58 0.13 235)','oklch(0.7 0.14 235)'],lavanda:['oklch(0.6 0.13 295)','oklch(0.72 0.14 295)'],ambra:['oklch(0.7 0.15 75)','oklch(0.78 0.16 75)'],grafite:['oklch(0.42 0.02 250)','oklch(0.75 0.02 250)']};var a=localStorage.getItem('pantryai-accent')||'salvia';var v=(A[a]||A.salvia)[d?1:0];r.style.setProperty('--primary',v);r.style.setProperty('--accent',v);r.style.setProperty('--ring',v);var F={sistema:['ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif','ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif'],moderno:['\"Inter\", ui-sans-serif, system-ui, sans-serif','\"Inter\", ui-sans-serif, system-ui, sans-serif'],serif:['\"Plus Jakarta Sans\", ui-sans-serif, system-ui, sans-serif','\"Fraunces\", ui-serif, Georgia, serif'],rotondo:['\"Nunito\", ui-sans-serif, system-ui, sans-serif','\"Nunito\", ui-sans-serif, system-ui, sans-serif']};var f=localStorage.getItem('pantryai-font')||'sistema';var ff=F[f]||F.sistema;r.style.setProperty('--font-body',ff[0]);r.style.setProperty('--font-display',ff[1])}catch(e){}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const inIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();
    const host = window.location.hostname;
    const isPreview =
      host.includes("id-preview--") ||
      host.includes("lovableproject.com") ||
      host === "localhost" ||
      host === "127.0.0.1";
    if (inIframe || isPreview) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Outlet />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
