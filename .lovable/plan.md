# Fix email auth + sessione persistente + notifiche in-app

## Diagnosi

### 1) Email auth non inviate
- Dominio `notify.pantryai.it` ✅ verificato.
- Ultimo invio in `email_send_log`: **8 maggio** (oggi 19 maggio → 11 giorni di silenzio).
- Nessun log auth recente: `auth-email-hook` non viene chiamato. Probabili cause: Lovable Emails disattivato in Cloud → Emails, o service-role key ruotata (vault secret del dispatcher non più valido).

### 2) Sessione utente
- `client.ts` ha già `persistSession: true` + `autoRefreshToken: true` → di default l'utente resta loggato.
- `login.tsx` ha logica "Ricordami" che **cancella `sb-*` da localStorage** prima del login: inutile e dannosa.
- Manca un listener `onAuthStateChange` a livello root che invalidi le query React-Query al refresh token → la sessione "sembra" persa e l'utente viene rimbalzato.

### 3) Notifiche in-app
- `daily-notifications` (route `/api/public/hooks/daily-notifications`) richiede `Authorization: Bearer SERVICE_ROLE_KEY`, ma **nessun cron la sta chiamando** (zero righe in `admin_activity_log` da `notifications`).
- `impostazioni/notifiche.tsx` per le push fa solo `Notification.requestPermission()` → **non registra un service worker, non crea una PushSubscription, non salva nulla in `push_subscriptions`**. Quindi le notifiche push non arrivano mai.
- La tabella `push_subscriptions` esiste (visibile in `admin_overview`) ma è vuota perché nessuno la popola.

## Cosa farò

### A. Email auth — ripristino
1. Riattivare Lovable Emails (`toggle_project_emails enabled: true`) se disattivato.
2. Ri-eseguire `setup_email_infra` (idempotente): aggiorna vault secret + cron `process-email-queue` con la service-role key corrente.
3. Re-scaffold con `confirm_overwrite: true` per riallineare l'hook lato Supabase (preserva i template `.tsx`).
4. Test reale con un reset password e verifica `email_send_log` → status `sent`.

### B. Sessione persistente "vera"
1. **`src/routes/login.tsx`**: rimuovere lo state `remember`, il checkbox "Ricordami" e il blocco che cancella `sb-*`. Mostrare nota "Resterai connesso su questo dispositivo".
2. **`src/routes/__root.tsx`**: aggiungere (se non c'è già) un `useEffect` con `supabase.auth.onAuthStateChange` che fa `router.invalidate()` + `queryClient.invalidateQueries()` per evitare stale data al refresh.
3. Nessuna modifica a `client.ts` (file auto-generato).

### C. Notifiche in-app
1. **Notifiche push reali** (`impostazioni/notifiche.tsx`):
   - Registrare `/sw.js` come Service Worker (già esiste in `public/`).
   - Chiamare `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID_PUBLIC_KEY> })`.
   - Salvare la `PushSubscription` (endpoint + p256dh + auth) in `push_subscriptions` collegata all'utente.
   - Pulsante "Disattiva" che fa `unsubscribe()` ed elimina la riga.
   - Aggiungere listener `push` in `public/sw.js` che mostra `self.registration.showNotification(...)`.
   - **Richiede secret VAPID** (`VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`): chiederò all'utente di aggiungerli via `add_secret`. In assenza, il pulsante mostra messaggio "Push non configurate".
2. **Digest giornaliero (`daily-notifications`)**:
   - Verificare se esiste un `cron.job` che lo chiama (richiede migration via Management API perché `cron` non è leggibile via psql con questo ruolo).
   - Creare via migration un `cron.schedule` ogni ora che fa `net.http_post` verso `https://dispensawebapp.lovable.app/api/public/hooks/daily-notifications` con header `Authorization: Bearer <service_role>` (recuperato da `vault.secrets`).
   - Verificare che le righe di `notification_preferences` abbiano `daily_send_hour` coerente con UTC.
3. **In-app feed** (opzionale, se l'utente intende "centro notifiche dentro l'app" più che push): creare una tabella `notifications` + dropdown campanella nell'`AppShell`. Da decidere — vedi domanda sotto.

## File toccati
- `src/routes/login.tsx` — rimozione Ricordami
- `src/routes/__root.tsx` — listener auth state (se mancante)
- `src/routes/_app/impostazioni.notifiche.tsx` — flow push reale
- `public/sw.js` — handler `push` / `notificationclick`
- Nuova migration — cron job per daily-notifications
- (Eventuale) tabella `notifications` + componente campanella

## Fuori scope
- Cambio provider email
- Modifiche RLS non strettamente necessarie
- Notifiche real-time via Supabase Realtime (a meno di richiesta esplicita)

## Domanda
Per "notifiche in app" intendi:
- (1) **Push del browser/PWA** (banner anche con app chiusa) — quello che oggi è rotto in `impostazioni/notifiche.tsx`?
- (2) **Centro notifiche interno** (campanella in alto con feed di eventi)?
- (3) **Entrambe**?

Procedo con (1) + cron del digest come default, salvo diversa indicazione.