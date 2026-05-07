## Sintesi

Combiniamo la richiesta corrente (acquisto articoli → dispensa giusta + scalo budget + scontrino) con le funzionalità mancanti rispetto alla visione dell'app. Procediamo a ondate piccole e testabili, partendo dal flusso spesa→dispensa→budget che è il blocco più richiesto.

## Stato attuale (cosa c'è già)

✅ Dispensa multipla, kcal AI, scadenze, posizioni  
✅ Lista spesa, suggerimenti AI prodotti, recommended_products  
✅ Ricette suggerite/salvate/personalizzate, like/dislike, tempi prep  
✅ Piano pasti settimanale  
✅ Home con budget settimanale, spesa mese, ricette rapide  
✅ Preferenze: diete, allergie, dislikes, obiettivi, budget, household_size  
✅ Multi-utente per household

## Cosa manca / da migliorare (prioritizzato)

### 🔴 ONDATA 1 — Flusso acquisto + budget (richiesta esplicita)

**`src/routes/_app/spesa.tsx`**
- Selettore **Dispensa di destinazione** in cima.
- Bottone **"Acquistato"** per singolo articolo → dialog con prezzo + quantità reale → inserisce in `food_items` (con `pantry_id` scelto) + crea riga `expenses` → rimuove dalla lista. Budget Home si scala automaticamente.
- Bottone in fondo **"Chiudi spesa"** con due modalità:
  - **Totale manuale**: inserisci importo scontrino → tutti gli spuntati vanno in dispensa, una sola `expenses`.
  - **📷 Foto scontrino (AI)**: upload foto → edge function `ai-scan-receipt` (Lovable AI vision Gemini) restituisce `{items:[{name,price,quantity}], total}`. Match per nome con articoli spuntati, gli sconosciuti vengono aggiunti come nuovi alimenti. Crea una sola `expenses` col totale.

**Nuova edge function** `supabase/functions/ai-scan-receipt/index.ts` — vision con `google/gemini-2.5-flash`, input `{imageBase64}`, output JSON strutturato.

### 🟡 ONDATA 2 — Scansione codici a barre + import ricette da link

**Barcode scanner in `dispensa.aggiungi.tsx`**
- Tab nuovo **"📷 Codice a barre"** usando `@zxing/browser` (Web API `getUserMedia`, funziona su mobile web e PWA).
- Lookup prodotto via **Open Food Facts API** (gratis, no key): `https://world.openfoodfacts.org/api/v2/product/{barcode}.json` → precompila nome, categoria, kcal, marca.
- Fallback: se non trovato, l'utente compila a mano col nome già letto.

**Import ricetta da URL in `ricette.nuova.tsx`**
- Tab **"🔗 Da link"** → nuova edge function `ai-import-recipe` che fa `fetch(url)`, estrae HTML e chiede a Gemini di strutturare titolo, ingredienti, istruzioni, tempo, costo stimato.

### 🟢 ONDATA 3 — Intelligenza adattiva + spiegazioni

**Apprendimento abitudini**
- Tracciare `recipe_feedback` (già presente) e `food_items` consumati per migliorare i suggerimenti — già parzialmente fatto. Estendere `ai-suggest-recipes` per pesare gli ingredienti **realmente usati spesso** (calcolato dai consumi storici).
- Aggiungere campo `last_used_at` su `food_items` (migration) e aggiornarlo quando un alimento viene rimosso/finito.

**Spiegazioni "perché"**
- Le ricette AI hanno già `reason`. Estendere anche al **piano pasti settimanale**: ogni entry mostra una badge "💡 perché" con motivo (es. "usa yogurt in scadenza", "rispetta budget").

**Filtri ricette**
- Aggiungere filtri rapidi sopra la lista ricette: **tempo max** (15/30/60 min), **costo max**, **difficoltà**. Già abbiamo i campi nel DB.

### 🔵 ONDATA 4 — Budget mensile + monitoraggio nel tempo

- Aggiungere campo `monthly_budget` a `user_preferences` (migration).
- In `impostazioni.tsx`: input per budget mensile.
- In Home: progress bar per budget mensile sotto quello settimanale.
- Nuova sezione **"Andamento spesa"** in Home o pagina dedicata `/statistiche` con grafico ultime 8 settimane (recharts già installato).

### ⚪ ONDATA 5 — Refinements UX

- Suggerimenti precompilati nelle dispense (es. "hai poca pasta?" se quantità < soglia).
- Notifiche in-app per scadenze imminenti (badge sul tab Dispensa).
- PWA: verificare manifest e installabilità su iOS/Android (già abbiamo `public/manifest.webmanifest`).

## Cosa NON faremo

- App nativa iOS/Android: la PWA copre tutti i target richiesti senza store. Lo segnaliamo come scelta architetturale.
- Sync multi-dispositivo: già garantita da Lovable Cloud (Supabase) — nessun lavoro extra.

## Database — migrations necessarie

Solo 2 piccole:
1. `food_items.last_used_at TIMESTAMPTZ NULL` (per ondata 3).
2. `user_preferences.monthly_budget NUMERIC NULL` (per ondata 4).

Nessuna nuova tabella.

## Ordine di esecuzione proposto

Ti chiedo di confermare se vuoi che parta **subito con l'Ondata 1** (la richiesta esplicita di oggi: acquisto + scontrino + scalo budget) e poi proseguire con le successive una alla volta, oppure se preferisci che faccia tutto insieme in un'unica grande modifica. La modalità incrementale è più sicura e ti permette di testare ogni step.
