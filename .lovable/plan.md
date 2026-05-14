
# Roadmap miglioramenti PantryAI

Audit basato su schema DB, edge functions esistenti e route attuali. Priorità: **P0** = bug/blocking, **P1** = alto impatto basso sforzo, **P2** = feature di valore, **P3** = visione/polish.

---

## 1. Spesa & Scontrino

### P0 — Affidabilità scan
- **Fallback OCR**: se `ai-scan-receipt` ritorna 0 prodotti, mostrare editor manuale pre-compilato col totale, non un errore. Logghiamo motivo (immagine sfocata, formato non supportato).
- **Compressione immagine lato client** prima dell'upload (max 1600px lato lungo, JPEG q80) — riduce 70% dei timeout Gemini.
- **Anteprima riga-per-riga modificabile** prima della conferma: oggi se l'AI sbaglia un prezzo si importa già sbagliato.

### P1 — Workflow
- **Storno parziale** (cambia quantità/prezzo) oltre allo storno totale già esistente.
- **Rettifica saldo manuale** già richiesta: aggiungere campo `note` obbligatoria + tipo (`rettifica`/`rimborso`) su `expenses` per audit.
- **Matching auto con lista spesa**: quando importi scontrino, spunta gli `shopping_list_items` corrispondenti (fuzzy match nome).
- **Categorizzazione automatica** dei prodotti scontrino via `ai-classify-foods` in batch (oggi sembra 1-by-1).

### P2 — Nuove feature
- **Storico scontrini con immagine**: bucket privato `receipts/`, link sull'`expense`.
- **Confronto prezzi nel tempo**: stesso prodotto in supermercati diversi → suggerisce dove conviene.
- **Import da email/PDF** (Esselunga, Conad mandano ricevute digitali).

---

## 2. Dispensa

### P0 — Kcal corrette
- Verificare che `ai-parse-food` ritorni `kcal_per_unit` consistente (per 100g vs per pezzo). Aggiungere campo `kcal_basis` (`per_100g` | `per_unit`) per evitare ambiguità.
- **Job di ricalcolo batch** già richiesto: rendere idempotente e mostrare progresso.

### P1 — UX
- **Ricerca + filtri** (categoria, scadenza, dispensa) — oggi solo lista lineare.
- **Bulk actions**: seleziona N item → sposta dispensa / elimina / aggiungi a lista spesa.
- **Indicatore "in scadenza"** con badge colorato (verde/giallo/rosso) basato su `expiry_warning_days`.
- **Quick-add da preferiti**: prodotti più usati in un tab dedicato (`last_used_at` già presente).

### P2 — Automazioni
- **Decremento automatico** quando cucini una ricetta dal piano (oggi non aggancia gli ingredienti).
- **Suggerimento riordino**: prodotto sotto soglia → push in lista spesa.
- **Barcode scanner** (camera + OpenFoodFacts API) → aggiunta in 2 secondi.

---

## 3. Piano pasti & Ricette

### P1 — Connessione con dispensa
- **"Cucina ora"** su un entry del piano → decrementa quantità ingredienti dalla dispensa.
- **Ricette suggerite da dispensa**: mostrare in homepage "puoi cucinare X cose con quello che hai" usando `ai-suggest-recipes` filtrato.
- **Rigenera singolo slot** del piano (oggi sembra solo rigenerazione settimana intera).
- **Drag & drop** per spostare ricette tra giorni/slot.

### P2 — Qualità ricette
- **Foto ricetta auto** via Gemini image (già abilitato sul gateway) quando manca `image_url`.
- **Scaling porzioni**: cambia `servings` → ricalcola ingredienti e kcal.
- **Lista spesa intelligente** dal piano: aggrega quantità, sottrae scorte dispensa, raggruppa per categoria/corsia supermercato.
- **Preferiti & collezioni** (tag già supportati, manca UI).

### P3 — Differenzianti
- **Modalità "cosa cucino con questi 5 ingredienti?"** stile Frigo Magico.
- **Voice mode** in cucina (mani sporche): leggi ricetta passo passo.

---

## 4. Budget & Statistiche

Stato attuale: solo budget mensile/settimanale + somma spese. Manca tutto il livello analitico.

### P1 — Visibilità
- **Pagina /statistiche** con:
  - Grafico linee spesa giornaliera vs budget proiettato.
  - Top 10 categorie del mese (pie chart).
  - Confronto mese corrente vs precedente.
  - Spesa per dispensa / per membro (`created_by`).
- **Forecast**: "al ritmo attuale supererai il budget di X€" sulla home.
- **Export CSV/PDF** report mensile (utile per chi divide spese di casa).

### P2 — Insight AI
- **Anomaly detection**: "questa settimana hai speso il 40% in più in snack".
- **Suggerimenti risparmio**: "comprando il formato grande risparmi 12€/mese".
- **Spreco alimentare**: traccia item scaduti non consumati → costo stimato sprecato.

### P3
- **Split spese tra membri** del nucleo con saldi tipo Splitwise.

---

## 5. Trasversali (debiti tecnici e qualità)

### P0
- **Audit hooks order**: il bug "Rendered fewer hooks" appena risolto in `dispensa.tsx` può essere ovunque ci sia un `if (...) return` prima di `useState`. Passata sistematica su tutte le route.
- **Error boundaries per route** con messaggio user-friendly + pulsante retry (oggi mostra stack trace).

### P1
- **Loading skeletons** uniformi (oggi mix di spinner e blank).
- **Empty states** illustrati con CTA chiara su dispensa/piano/ricette/spesa vuoti.
- **Offline-first** della dispensa: cache con TanStack Query + mutations ottimistiche (alcune già presenti, da estendere).
- **PWA install prompt** + icona home screen (manifest già presente, mancare prompt + screenshots store).

### P2
- **Ruolo "viewer" e "co-genitore"** già nel db (`member_role`) ma non sfruttato in UI.
- **Notifiche push** (tabelle già pronte, edge function da scrivere): scadenze, lista spesa pronta, piano settimanale generato.
- **i18n**: oggi tutto hardcoded in italiano, predisporre per EN/ES.

---

## Ordine consigliato di esecuzione (sprint)

```text
Sprint 1 (1 settimana)  — P0 bugs + scan reliability
  - Hook order audit globale
  - Compressione immagine + fallback editor scontrino
  - Kcal: campo kcal_basis + ricalcolo idempotente
  - Error boundaries per route

Sprint 2 — Workflow Spesa & Dispensa
  - Anteprima/edit pre-import scontrino
  - Match auto scontrino ↔ lista spesa
  - Ricerca/filtri/bulk actions dispensa
  - Storno parziale + rettifica con note

Sprint 3 — Pagina Statistiche + Forecast budget
  - Grafici (Recharts già nello stack), export CSV
  - Anomaly insight AI

Sprint 4 — Connessione Piano ↔ Dispensa ↔ Spesa
  - "Cucina ora" decrementa scorte
  - Lista spesa intelligente da piano
  - Rigenera singolo slot, drag&drop

Sprint 5 — Push notifications + offline + PWA install
```

---

## Sezione tecnica (note implementative)

- **kcal_basis**: aggiungere enum `kcal_basis_type` (`per_100g`, `per_unit`, `per_ml`) su `food_items`; aggiornare `ai-parse-food` per restituirlo esplicitamente; helper TS `computeTotalKcal(item)` centralizzato.
- **Statistiche**: query SQL aggregate via RPC `household_stats(household_id, from, to)` per evitare 1000-row limit di Supabase.
- **Push**: edge function schedulata con `pg_cron` su endpoint `/api/public/notifications/dispatch` (signature HMAC), legge `notification_preferences`.
- **Decremento dispensa da ricetta**: nuovo RPC `consume_recipe(meal_plan_entry_id)` transazionale che decrementa `food_items.quantity` per ogni `recipe_ingredients` con match nome.
- **Storno parziale**: nuova tabella `expense_adjustments(expense_id, amount_delta, reason, created_by)` invece di mutare `expenses.amount`.
- **Hook order**: lint rule `react-hooks/rules-of-hooks` già attiva — verificare che non ci siano `eslint-disable`.

---

Dimmi quale sprint vuoi che pianifichi nel dettaglio (con file, schema, funzioni edge) e procediamo.
