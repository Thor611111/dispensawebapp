
# Piano: Notifiche automatiche, Dashboard admin, Bug check, Export

## 1. Invio automatico notifiche (1×/giorno)

**Backend**
- Nuova tabella `user_roles` con enum `app_role` (`admin`, `user`) + funzione `has_role(uuid, app_role)` SECURITY DEFINER (pattern standard, no recursion).
- Server route `src/routes/api/public/hooks/daily-notifications.ts`:
  - Auth via header `apikey` (anon key) — pattern canonico pg_cron.
  - Per ogni household con `notification_preferences.daily_send_hour == ora corrente UTC`:
    - Calcola alimenti in scadenza (≤ `expiry_warning_days`).
    - Calcola pasti pianificati per oggi/domani.
    - Calcola lista spesa pendente.
    - Per ogni membro:
      - Se `push_enabled` e ha `push_subscriptions` → invia Web Push (richiede `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` come secrets, libreria `web-push` compatibile Worker).
      - Se `email_enabled` → enqueue email transazionale via `enqueue_email`.
- Cron `pg_cron` ogni ora (`0 * * * *`) che chiama l'endpoint con body `{}`.

**Setup richiesto**
- Email infra (`setup_email_infra`) se non già attiva → richiederà setup dominio email se mancante.
- Generare e salvare VAPID keys come secrets (`add_secret`).

## 2. Dashboard Admin (`/admin`)

**Accesso**: stesso login utente, ma sbloccato solo se `has_role(auth.uid(), 'admin')`.
- Bootstrap admin: migration inserisce il tuo `user_id` (chiederò email) come admin.
- Layout route `src/routes/_admin.tsx` con `beforeLoad` che verifica ruolo via RPC `is_current_user_admin()`; redirect se non admin.
- Link "Admin" visibile in Impostazioni solo se admin.

**Pagine**
- `/admin` — Overview: tot utenti, household, ricette, food_items, expenses (mese), invii email/push ultimi 7gg.
- `/admin/utenti` — Lista profili con email (via view sicura), data registrazione, household, azione: promuovi/revoca admin, elimina account (chiama `delete-account`).
- `/admin/household` — Lista household con membri e contatori.
- `/admin/contenuti` — Gestione `recipes` con `is_system=true` (CRUD) e `recommended_products`.
- `/admin/log-email` — Tabella `email_send_log` con filtri stato/data.
- `/admin/log-notifiche` — Storico invii push (nuova tabella `push_send_log`).
- `/admin/log-attivita` — Eventi sistema (errori cron, ecc., nuova tabella `admin_activity_log`).

**Sicurezza**
- Tutte le query admin passano da server functions con middleware che verifica `has_role`.
- View `admin_users_view` (security_invoker) che espone email da `auth.users` solo a chi è admin (policy `USING (has_role(auth.uid(),'admin'))`).
- RLS aggiornata su tabelle log per permettere SELECT a admin.

## 3. Bug check completo

Verifica end-to-end:
- Build TS senza errori.
- Auth flow: signup → email verify → login → onboarding → home.
- Dispensa: aggiungi/modifica/elimina, filtro scadenze.
- Piano mensile: drawer giorno, salvataggio entries, persistenza mesi precedenti.
- AI → Spesa: invocazione edge function, deduplica vs dispensa.
- Casa condivisa: genera invito, join via `/join/$code`.
- Notifiche: permesso browser, registrazione push subscription.
- Impostazioni: tutte le sotto-pagine, salvataggio preferenze.
- Linter Supabase + security scan, fix di eventuali warning.

## 4. Export codice (ZIP)

Script che zippa `src/`, `supabase/`, `public/`, file root config (package.json, vite.config, tsconfig, ecc.) in `/mnt/documents/dispensa-app-export.zip`, escludendo `node_modules`, `.output`, `dist`, `routeTree.gen.ts`. Output come `<lov-artifact>` scaricabile.

## Ordine di esecuzione
1. Migration: `user_roles`, `has_role`, view admin, log tables, policies, bootstrap admin (chiederò email).
2. Setup email infra + VAPID secrets.
3. Server route daily-notifications + cron job.
4. Dashboard admin (route, pagine, server functions).
5. Bug check (build, linter, scan, fix).
6. Generazione ZIP export.

## Domanda residua
Per nominarti admin in fase di migration mi serve la **email del tuo account** (quella con cui fai login nell'app). Te la chiederò all'inizio dell'implementazione.
