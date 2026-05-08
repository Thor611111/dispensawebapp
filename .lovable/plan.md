
## Obiettivo

Permettere agli utenti di installare PantryAI sulla home del telefono (iOS/Android) e sul desktop, con un pulsante "Installa app" nativo dell'app. Inoltre chiarire cosa serve per pubblicare su App Store e Play Store.

---

## Parte 1 — Installabilità (PWA "manifest-only")

L'app ha già `public/manifest.webmanifest` con `display: standalone`, icone 192/512 e theme color. Questo è già sufficiente per essere installabile su Android e desktop (Chrome/Edge) e per "Aggiungi a Home" su iOS Safari. Manca solo l'esperienza utente che la suggerisce.

**Cosa aggiungo (solo frontend, nessun service worker):**

1. Hook `useInstallPrompt` in `src/hooks/use-install-prompt.tsx`
   - Cattura l'evento `beforeinstallprompt` (Android/desktop) e lo conserva.
   - Rileva iOS Safari e modalità già installata (`display-mode: standalone` / `navigator.standalone`).
   - Espone `{ canInstall, isIOS, isInstalled, promptInstall() }`.

2. Componente `InstallAppCard` in `src/components/InstallAppCard.tsx`
   - Su Android/desktop: pulsante "Installa app" che chiama `promptInstall()`.
   - Su iOS: istruzioni brevi ("Tocca Condividi → Aggiungi a Home").
   - Si nasconde se l'app è già installata o se l'utente l'ha chiusa (flag in `localStorage`).

3. Punti di ingresso nell'app
   - Banner discreto in `src/routes/_app/home.tsx` (sopra il contenuto, dismissibile).
   - Voce "Installa app" nella pagina `src/routes/_app/impostazioni.tsx`.
   - Pulsante "Installa app" nella landing `src/routes/index.tsx` accanto a "Inizia gratis".

4. Verifica `public/manifest.webmanifest`
   - Aggiungo `id: "/"` e `scope: "/"` per stabilità install (cambia solo per nuove installazioni, non rompe quelle esistenti).
   - Mantengo `display: standalone`, theme color esistente.

**Non includo** `vite-plugin-pwa` né service worker: non serve per l'installabilità e creerebbe problemi di cache nella preview Lovable. Questo significa: niente offline. Se in futuro serve l'offline lo affrontiamo separatamente.

---

## Parte 2 — App Store e Play Store

Risposta breve: **sì, è possibile, ma non è automatico** e non lo si fa "da Lovable". Ci sono due strade:

### Opzione A — Pubblicare la PWA come app "wrappata" (consigliata, costo basso)
- **Play Store (Android)**: si crea una **TWA** (Trusted Web Activity) con Bubblewrap di Google. La PWA pubblicata su `dispensawebapp.lovable.app` (o un dominio custom) viene impacchettata in un APK/AAB e caricata sul Play Store. Servono: account Google Play Developer (~25 $ una tantum), file `assetlinks.json` sul dominio, icone store, screenshot, privacy policy.
- **App Store (iOS)**: Apple non accetta PWA pure. Si usa un wrapper come **Capacitor** (o PWABuilder iOS) che incapsula il sito in una WebView nativa. Servono: account Apple Developer (99 $/anno), Mac con Xcode (o servizio di build cloud tipo Codemagic/Ionic Appflow), icone, screenshot, privacy policy, conformità alle linee guida Apple (l'app deve offrire valore "nativo": notifiche push, fotocamera, ecc., altrimenti rischia il rifiuto in review).

Vantaggi: una sola codebase (questa). Tempi: 1–2 settimane di lavoro extra.

### Opzione B — App nativa vera (React Native/Flutter)
- Riscrivere l'interfaccia mobile in React Native o Flutter, riusando le API/Cloud esistenti. Maggior costo e tempo, ma esperienza più "nativa". **Lovable non genera React Native**, andrebbe fatto fuori.

### Cosa posso fare ora dentro Lovable
Solo la Parte 1 (installabilità + UX di install prompt). Il packaging per gli store si fa fuori da Lovable, una volta che l'app web è stabile e pubblicata su un dominio (anche `notify.pantryai.it` o un dominio principale).

---

## Dettagli tecnici

- File creati: `src/hooks/use-install-prompt.tsx`, `src/components/InstallAppCard.tsx`.
- File modificati: `public/manifest.webmanifest` (aggiunta `id`/`scope`), `src/routes/_app/home.tsx`, `src/routes/_app/impostazioni.tsx`, `src/routes/index.tsx`.
- Nessuna modifica a backend, DB o edge function.
- Nessun service worker, nessun `vite-plugin-pwa`.
- Tipizzazione `BeforeInstallPromptEvent` definita localmente nell'hook.

---

## Domanda per te prima di procedere

Vuoi che proceda con la **Parte 1** (rendere l'app installabile con pulsante e istruzioni iOS) e che successivamente, in un task separato, prepariamo la guida + i file (icone, manifest, assetlinks.json) per impacchettarla per Play Store e App Store? Oppure preferisci limitarti per ora alla sola installabilità web?
