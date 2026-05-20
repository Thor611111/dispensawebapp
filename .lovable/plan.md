# Piano di evoluzione PantryAI

Il lavoro richiesto è ampio (10 aree, tocca DB, UI, AI, scanner). Lo divido in **5 fasi rilasciabili in modo indipendente**, in modo da poter testare ogni step prima di passare al successivo.

---

## Fase 1 — Profilo utente "adulto / bambino" + riorganizzazione UI
**Aree richieste:** 1, 4

- Aggiungere campo `member_kind` (`adult` | `child`) su `household_members`, default `adult`.
- Modificabile solo da `/impostazioni/profilo` (mai esposto altrove).
- Regola lato client + RLS: i `child` possono solo leggere `food_items`, `shopping_list_items`, `meal_plan_entries`, `recipes`. Insert/Update/Delete bloccati.
- Spostare la card **statistiche** dalla home → `/impostazioni/profilo` (sezione "Le tue statistiche").
- Home: mantenere solo azioni → "Cosa cucinare", "Cosa manca", "Aggiungi alimento", "Scansiona scontrino", "Ricette rapide per te".
- Realtime sulla dispensa: già usiamo Supabase; attivare `supabase.channel` su `food_items` + `shopping_list_items` filtrati per `household_id`.

## Fase 2 — Inserimento alimenti + scanner barcode (riduzione attrito)
**Aree richieste:** 5, 6, 9

- In `dispensa/aggiungi`: 
  - Rimuovere campo **kcal** ovunque (form, dispensa, AI). Mantenere colonna DB ma non più mostrata/scritta.
  - Dropdown unità: `pz`, `confezione`, `g`, `kg`, `l`, `ml`.
  - Bottone "Suggerisci scadenza" → AI breve (riusa `ai-parse-food` estendendolo con `suggested_expiry_days`) + precompila campo data.
- Scanner barcode: integrare lookup OpenFoodFacts (gratuito, no key):
  - on scan → fetch `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
  - precompila `name`, `category`, `quantity` (da `product_quantity`), unità.
  - Aggiunge "scadenza suggerita" da AI in base alla categoria.
  - UI mostra i campi già pieni con badge "auto", utente conferma in 1 tap.

## Fase 3 — Sezione Ricette completa
**Aree richieste:** 2, 7

- Nuova route `/ricette` con tab:
  - **Libreria**: lista ricette con filtri (Preferite, Recenti, "Posso cucinare ora" = match con dispensa).
  - **Genera**: bottone "Genera da dispensa" che chiama `ai-suggest-recipes` con `count: 6`. Risultato salvabile in libreria.
- Dettaglio ricetta `/ricette/$id`:
  - Ingredienti con badge ✅ "in dispensa" / ❌ "manca" (match per nome normalizzato).
  - Preparazione passo-step (parse `instructions` per `\n`).
  - Tempo, costo stimato, porzioni.
  - CTA: **Cucina ora**, **Aggiungi al piano**, **Aggiungi mancanti alla spesa**, like / dislike.
- like/dislike usa `recipe_feedback` già esistente.

## Fase 4 — Personalizzazione adattiva
**Area richiesta:** 3

- Nuova tabella `recipe_views` (recipe_id, user_id, viewed_at) per tracciare visualizzazioni.
- `ai-suggest-recipes` estesa: riceve in input anche
  - ultime 20 ricette `like`/`dislike` da `recipe_feedback`
  - top 10 ingredienti più usati (da `food_items.last_used_at`)
  - lista `dislikes` da `user_preferences`
- Prompt aggiornato per: evitare dislike, favorire ingredienti frequenti, variare rispetto alle viste recenti.
- Piano pasti: pulsante "Rigenera piano personalizzato" che usa la stessa logica.

## Fase 5 — Flusso UX guidato + micro-CTA
**Aree richieste:** 8, 10

- Banner contestuale in Home con 4 step progressivi: 
  1. Aggiungi alimenti → 2. Vedi ricette → 3. Scegli → 4. Aggiungi al piano.
  Mostra solo lo step incompleto corrente.
- CTA rapide nelle card ricetta:
  - **Cucina ora** → segna ingredienti usati, scala quantità in dispensa.
  - **Usa questi ingredienti** → filtra ricette per quegli ingredienti.
  - **Completa la tua dispensa** → aggiunge mancanti alla spesa.

---

## Note tecniche
- DB: 1 nuova colonna (`household_members.member_kind`), 1 nuova tabella (`recipe_views`), aggiornamento policy RLS per child read-only.
- Edge functions: estensioni minime a `ai-parse-food` e `ai-suggest-recipes`, niente nuove funzioni Edge (uso AI Gateway esistente).
- OpenFoodFacts: chiamata diretta dal client, nessuna chiave necessaria.

---

## Cosa propongo di fare adesso
Implemento **Fase 1 + Fase 2** in questo turno (sono le fondamenta: profilo utente, realtime, UX inserimento, scanner). Le fasi 3–5 in turni successivi così puoi validare ogni step.

Confermi questo ordine, o vuoi che inizi da una fase diversa (es. ricette prima)?
