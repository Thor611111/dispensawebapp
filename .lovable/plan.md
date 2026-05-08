# Fix tasto "Installa app"

## Problema

Il tasto "Installa app" non si attiva su Chrome/Android perché manca il **service worker**: senza, il browser non emette mai l'evento `beforeinstallprompt` che `useInstallPrompt` aspetta. Risultato: `canInstall` resta `false` e il bottone non compare (oppure su iPhone mostra solo le istruzioni manuali, ma su Android/desktop non succede nulla).

Manifest e icone sono già a posto — manca solo il SW e la sua registrazione.

## Cosa fare

1. **Creare `public/sw.js`** — service worker minimo (install/activate + fetch passthrough con piccola cache offline per la shell). Sufficiente per soddisfare i criteri PWA di Chrome.
2. **Registrare il SW** all'avvio dell'app (in `src/routes/__root.tsx` dentro `RootComponent`, in un `useEffect` client-side che chiama `navigator.serviceWorker.register('/sw.js')` solo in produzione/preview, non in SSR).
3. **Verificare il manifest**: già OK (`name`, `short_name`, `start_url`, `display: standalone`, icone 192 + 512, `theme_color`). Nessuna modifica.
4. **Test**: dopo il deploy, su Chrome desktop il prompt nativo di installazione appare automaticamente entro pochi secondi → `canInstall` diventa `true` e il bottone funziona. Su iOS resta il flusso manuale "Aggiungi a Home" (limite Safari, non aggirabile).

## Note

- Su `localhost`/preview Lovable il SW funziona (HTTPS).
- Non serve Workbox né librerie aggiuntive.
- Il SW non interferisce con TanStack Start: serve solo la shell statica.
