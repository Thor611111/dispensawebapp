## Admin Dashboard — Owner-only, log completi, console comandi, gestione utenti

### 1. Restrizione accesso al solo Owner

- Aggiungere ruolo `owner` (oltre ad `admin`) nell'enum `app_role` Postgres.
- Migrazione che assegna `owner` a `mangino.manuel2@gmail.com` (lookup su `auth.users`).
- Nuova funzione SQL `is_current_user_owner()` (security definer).
- Modificare `useIsAdmin` → `useIsOwner` (o aggiungere hook parallelo) e proteggere `/admin/*` solo per owner. Gli admin "normali" perdono accesso alla dashboard.
- Tutte le RPC admin (`admin_overview`, `admin_list_users`, `admin_set_role`, nuove RPC sotto) richiederanno `is_current_user_owner()`.

### 2. Pulizia overview

- Rimuovere widget saldo/spese/`expenses_month` dall'overview.
- Sostituire con: utenti totali, ultimi accessi, errori 24h, dimensione tabelle principali, code email/push.

### 3. Sezione Log unificata (`/admin/logs`)

Tabs con filtri (data range, livello, ricerca testo) e bottone "Esporta CSV":
- **Email** (`email_send_log`)
- **Push** (`push_send_log`)
- **Attività admin** (`admin_activity_log`)
- **Auth** (via `supabase--analytics_query` su `auth_logs`) — server fn dedicata
- **Edge function errors** (via `function_edge_logs`) — server fn dedicata

Esportazione CSV generata client-side dai dati caricati.

### 4. Console comandi (`/admin/console`)

Due modalità affiancate:

**A. Pulsanti rapidi (form)**
- Trigger notifiche giornaliere
- Pulizia inviti scaduti
- Reinvio email fallite
- Vacuum log >90gg
- Refresh statistiche

**B. CLI testuale**
- Input con autocomplete (cmdk già presente)
- Comandi supportati:
  - `help`
  - `user find <email|id>`
  - `user reset-password <email>` → invia recovery email
  - `user set-email <id> <newEmail>`
  - `user set-name <id> <name>`
  - `user delete <id>`
  - `user impersonate <id>` → genera magic link, apre in nuova tab
  - `cron run daily-notifications`
  - `log tail <email|push|auth|admin> [n]`
  - `db count <table>`
- Storico comandi (↑/↓), output area scroll-back.
- Tutti i comandi passano per **una sola server function** `runAdminCommand({ accessToken, command })` che:
  - verifica owner
  - parse + dispatch
  - logga ogni esecuzione su `admin_activity_log` con metadata (comando, esito)

### 5. Gestione utenti (`/admin/utenti` — esteso)

Per ogni riga: menu azioni con
- Reset password (recovery email via `supabaseAdmin.auth.admin.generateLink type=recovery`)
- Cambia email (`supabaseAdmin.auth.admin.updateUserById`)
- Cambia nome (update `profiles.display_name`)
- Elimina account (riusa logica edge `delete-account` portata in server fn admin)
- **Impersonifica** → genera magic link, apre in nuova tab (logout di sicurezza dopo)

Dialog di conferma per azioni distruttive. Ogni azione loggata.

### 6. Sicurezza

- Tutte le nuove server fn in `src/lib/admin.functions.ts` (singolo file, già pattern esistente) usano `requireSupabaseAuth` + check `is_current_user_owner` server-side.
- Operazioni privilegiate (impersonate, deleteUser, updateUserById) usano `supabaseAdmin` solo dopo aver confermato owner.
- Magic link impersonate scade dopo 60s.
- Aggiornamento `mem://security` per documentare modello owner-only.

### 7. UI/UX

- Layout admin esistente: aggiungere tab `Console` e `Logs` (Overview, Utenti, Logs, Email, Console).
- Console: terminale dark con font monospace, output colorato per tipo, prompt `pantryai>`.
- Tabella log: virtualizzata se >500 righe, paginazione 100.

### Dettagli tecnici

**Migrazione SQL:**
```text
ALTER TYPE app_role ADD VALUE 'owner';
INSERT INTO user_roles (user_id, role)
  SELECT id, 'owner' FROM auth.users WHERE email='mangino.manuel2@gmail.com'
  ON CONFLICT DO NOTHING;
CREATE FUNCTION is_current_user_owner() ...;
-- nuove RPC: admin_reset_user_password, admin_update_user_email,
-- admin_update_user_name, admin_delete_user, admin_impersonate_user,
-- admin_run_command (logging only, esecuzione lato server fn)
```

**File toccati:**
- nuova migration
- `src/lib/admin.functions.ts` (estesa con ~10 nuove server fn)
- `src/lib/queries.ts` (`useIsOwner`)
- `src/routes/admin.tsx` (gate owner + nav)
- `src/routes/admin.index.tsx` (overview pulita)
- `src/routes/admin.utenti.tsx` (azioni estese)
- nuovi: `src/routes/admin.console.tsx`, `src/routes/admin.logs.tsx`
- componente `<AdminConsole />`, `<LogTable />`, `<UserActionsMenu />`
- rimuovere link admin da `impostazioni.tsx` per non-owner

### Fuori scope

- 2FA per owner (può essere step successivo)
- Audit storico esportazioni
- Rate limiting comandi CLI
