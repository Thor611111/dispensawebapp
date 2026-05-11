## 1. Owner Console — Overview pulita

In `src/routes/admin.index.tsx`:
- Rimuovo le card **Ricette**, **Alimenti**, **Spesa attiva** (e relative icone non usate).
- Mantengo: Utenti totali, Nuovi 7gg, Household, Email 7gg, Push 7gg, Email/Push fallite 24h, Azioni admin 24h.
- Lascio il blocco "Notifiche giornaliere" come è.

Nessuna modifica all'RPC `admin_overview` (i campi extra restano disponibili ma non vengono mostrati — evitiamo migrazione inutile).

## 2. Gestione utenti (già presente, miglioro accessibilità)

La pagina `/admin/utenti` ha già il menu "⋯" su ogni riga con:
- Reset password (email magic link)
- Cambia email
- Cambia nome
- Impersonifica
- Promuovi/Revoca admin
- Elimina account

**Migliorie UX**:
- Sostituisco il menu nascosto con una **toolbar di azioni rapide** sempre visibile per ogni utente (icone con tooltip): reset password, edit email, edit nome, impersonate, delete. Ruoli (promote/revoke admin) restano in dropdown secondario per evitare clic accidentali.
- Aggiungo conferma anche per "Reset password" (al momento parte senza conferma).
- Aggiungo colonna "Household" (id breve) per rendere chiaro a quale nucleo appartiene.

Nessuna nuova RPC o server function — uso quelle esistenti in `src/lib/admin.functions.ts`.

## 3. Utente — modifica quantità prodotti (dispensa + spesa)

**Dispensa** (`src/routes/_app/dispensa.tsx`):
- Sulla riga di ogni `food_item`, accanto a "{quantity} {unit}", aggiungo controlli `−` / `+` (step intelligente: 1 per `pz`, 50 per `g`/`ml`, 0.1 per `kg`/`l`) e un input numerico inline editabile.
- Al cambio: `update food_items set quantity = ... where id = ?` + invalidate `["food", hid]`.
- Se quantità ≤ 0 → propongo eliminazione (toast con undo).

**Spesa** (`src/routes/_app/spesa.tsx`):
- Stessi controlli `−` / `+` / input sulle righe della shopping list (linea 347).
- Update via `supabase.from("shopping_list_items").update({ quantity }).eq("id", id)`.

**Componente condiviso** `src/components/QuantityStepper.tsx`:
- Props: `value`, `unit`, `onChange(next)`, `min=0`.
- Step automatico in base all'unità.
- Layout compatto adatto a mobile (la viewport è già responsive).

Le RLS esistenti (`Members update food`, `Members update shopping`) coprono già queste mutazioni.

## File toccati

- `src/routes/admin.index.tsx` — rimuove 3 stat
- `src/routes/admin.utenti.tsx` — toolbar azioni + conferma reset
- `src/components/QuantityStepper.tsx` — nuovo
- `src/routes/_app/dispensa.tsx` — integrazione stepper
- `src/routes/_app/spesa.tsx` — integrazione stepper

Nessuna migrazione DB.
