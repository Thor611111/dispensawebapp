## Obiettivo

1. Rendere la scansione scontrino davvero "smart": confrontare con la lista della spesa, smistare nelle dispense corrette, gestire articoli incerti con conferma e prezzo manuale, e calcolare correttamente il totale.
2. Rendere la sezione **Admin Dashboard** immediatamente accessibile per `mangino.manuel2@gmail.com` (e altri admin), oltre che dalle Impostazioni.

---

## 1. Scansione scontrino smart (`src/routes/_app/spesa.tsx` + edge fn)

### Flusso utente (nuovo dialog "Riconcilia scontrino")
Dopo lo scan, invece dell'attuale conferma "tutto in dispensa", apri uno step di riconciliazione:

```text
┌─ Scontrino rilevato ─────────────────────────┐
│ Totale OCR: 42,30 €   [modifica]             │
│                                              │
│ ✅ Latte 1L           1,29€  → Casa  [✓]     │ (match lista)
│ ✅ Pasta 500g         0,89€  → Casa  [✓]     │
│ ❓ Yogurt greco       1,50€  → ?     [Sì/No] │ (incerto, no match)
│ ❓ Articolo illeggib. —      → ?     [Sì/No] │ (prezzo mancante → input)
│ ➕ Pane (in lista, non rilevato) [Acquistato? Sì/No] │
│                                              │
│ Subtotale articoli confermati: 38,40 €       │
│ Differenza vs totale: 3,90 € (es. sconti)    │
│ [Conferma e salva]                           │
└──────────────────────────────────────────────┘
```

Per ogni riga lo scontrino mostra:
- **Stato**: ✅ (matchato con lista spesa con confidenza ≥0.7), ❓ (incerto/non in lista), ➕ (in lista ma non rilevato).
- **Switch "acquistato"** (default ON per ✅, OFF per ❓/➕).
- **Select dispensa** (default = quella scelta nel dialog, oppure quella dell'item in lista).
- **Input prezzo** modificabile (richiesto se mancante).
- **Quantità/unità** modificabili.

### Logica di matching (helper `matchReceiptToShopping`)
Per ogni item OCR cerca nella lista spesa:
- Normalizzazione (lowercase, rimozione plurali/accenti).
- Score = max(token overlap, prefix 4 char, fuzzy Levenshtein normalizzato).
- ≥0.7 → auto-match (✅); 0.4–0.7 → suggerito ma da confermare; <0.4 → ❓.
Le voci della lista non matchate diventano righe "➕".

### Calcolo totale
- `totalOCR` = totale rilevato dall'AI.
- `totalConfermato` = somma prezzi delle righe acquistate.
- Se differenza > 0,50 € mostra avviso ("Possibili sconti/articoli mancanti: X,XX €") e permette di:
  - usare totale OCR (consigliato, registra differenza come "Sconti/varie" senza voci dispensa),
  - usare somma articoli,
  - inserire manualmente.
- Il valore scelto va in `expenses.amount`.

### Persistenza al "Conferma"
- `food_items` insert per ogni riga acquistata (con `pantry_id` selezionato, `price`, classificazione AI come oggi).
- `shopping_list_items` delete per gli item della lista spuntati come acquistati (matchati ✅ o ➕ confermati).
- `expenses` insert con totale finale e nota `Spesa (scontrino)`.
- Se ci sono ❓ NON acquistati o ➕ NON acquistati, restano in lista (o non vengono creati).

### Edge function `ai-scan-receipt`
- Aggiungere al system prompt richiesta esplicita: per ogni item restituire `name, quantity, unit, price, confidence (0-1), raw_text`.
- Restituire anche `subtotal`, `discounts`, `total` separatamente quando leggibili (per spiegare differenze).

---

## 2. Accesso rapido Admin per `mangino.manuel2@gmail.com`

### Stato attuale
Il link "Admin Dashboard" è già in `/impostazioni` ma solo se `useIsAdmin()` è true. Verificare se l'utente ha effettivamente il ruolo `admin` in `user_roles`; se no, eseguire migration di seed.

### Modifiche
1. **Migration**: assicurarsi che `mangino.manuel2@gmail.com` abbia `user_roles.role = 'admin'` (insert idempotente via subquery su `auth.users`).
2. **Shortcut visibile per admin** (la più comoda secondo me = mix tra Home e Impostazioni):
   - **Home (`src/routes/_app/home.tsx`)**: se `isAdmin`, mostrare in fondo (sotto le card principali) una card discreta "🛡 Admin Dashboard → Apri" che linka a `/admin`. Non invasiva per utenti normali (condizionale).
   - **Impostazioni**: la voce esistente resta, ma viene spostata **in cima** alla lista quando `isAdmin` per accesso immediato.
3. (Opzionale, no UI extra) il bottom nav resta a 5 voci, niente ingombro per gli utenti standard.

---

## Dettagli tecnici

- File modificati:
  - `src/routes/_app/spesa.tsx` — nuovo dialog di riconciliazione (sostituisce `closeWithScan`); helper di matching estratto in `src/lib/receipt-match.ts`.
  - `src/lib/receipt-match.ts` — nuovo, funzione pura `matchReceipt(ocrItems, shoppingItems)` → righe annotate.
  - `supabase/functions/ai-scan-receipt/index.ts` — schema arricchito (`confidence`, `subtotal`, `discounts`).
  - `src/routes/_app/home.tsx` — card admin condizionale.
  - `src/routes/_app/impostazioni.tsx` — riordino voce Admin in cima per admin.
  - Migration SQL — grant ruolo admin a `mangino.manuel2@gmail.com`.

- Nessuna modifica allo schema DB (solo seed di `user_roles`).
- Nessuna nuova dipendenza npm (matching scritto a mano, leggero).

---

## Out of scope
- Riconoscimento del negozio/insegna dallo scontrino.
- Storico scontrini scansionati (al momento solo ledger `expenses`).
- Split per dispensa multiple in un unico item (un articolo → una sola dispensa).
