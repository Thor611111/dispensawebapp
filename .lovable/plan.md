
# Piano di estensione PantryAI

Espansione completa dell'app con dashboard, gestione ricette migliorata, multi-dispense, kcal e altre funzioni richieste.

## 1. Modifiche al database (migration)

Nuova migration che aggiunge:

- `food_items.kcal_per_unit numeric` — kcal calcolate dall'AI per ogni alimento
- `food_items.pantry_id uuid` — riferimento alla dispensa specifica (multi-dispense)
- Nuova tabella `pantries` (id, household_id, name, icon, created_at) con RLS basato su `is_household_member` — permette di gestire più dispense (es. "Casa", "Ufficio", "Mamma")
- `recipes` già esiste: aggiungiamo `is_favorite boolean default false` e `tags text[]`
- `recipe_feedback` già esiste ma `recipe_id` referenzia ricette non sempre salvate; aggiungiamo `recipe_title text` per feedback su ricette AI non ancora salvate
- Nuova tabella `recommended_products` (id, household_id, name, category, reason, created_at) generata dall'AI come suggerimenti spesa

## 2. Nuova home dashboard `/home`

Creo `src/routes/_app/home.tsx` come tab principale. Contiene:

- Saldo budget settimanale: `weekly_budget - spesa settimana corrente` con barra di progresso
- Totale spesa mese corrente
- Data corrente (mese/anno)
- 2 ricette rapide generate dall'AI in base alla dispensa (cache giornaliera in `localStorage` per non bruciare crediti AI)
- Counter alimenti in scadenza (entro 3 giorni)
- Link rapidi a Dispensa / Ricette / Spesa

Aggiungo "Home" come prima tab in `AppShell` (icona Home). Cambio redirect post-login a `/home`.

## 3. Sezione Ricette: salvate, personalizzate, like/dislike funzionanti

Refactor `src/routes/_app/ricette.tsx`:

- Tabs: **Suggerite (AI)** | **Salvate** | **Mie ricette**
- Per ogni ricetta AI: pulsante "Salva" che inserisce in `recipes` + `recipe_ingredients` con `household_id`
- **Like/Dislike funzionanti**: salva in `recipe_feedback` usando `recipe_title` come chiave quando la ricetta non è ancora salvata, altrimenti `recipe_id`. Lo stato persiste e l'AI userà il contesto (dislikes/likes) nei prompt successivi
- Tab "Mie ricette": form per creare ricetta personalizzata (titolo, ingredienti, istruzioni, tempo prep, kcal, difficoltà)
- Mostro **tempo di preparazione in evidenza** sulle card (era già nel JSON, ora messo come badge prominente con icona ⏱️)

Aggiorno `ai-suggest-recipes` edge function: passa nel system prompt anche feedback (like/dislike) dell'utente per migliorare i suggerimenti.

## 4. Dispensa multi-pantry + kcal + svuota

Refactor `src/routes/_app/dispensa.tsx`:

- Selettore dispense in alto (chip "Casa", "+ Nuova dispensa")
- Modale per creare nuova dispensa (nome + icona)
- Tasto "Svuota dispensa" (con conferma `AlertDialog`) che cancella tutti gli alimenti della dispensa attiva
- Mostra kcal stimate per ogni alimento e totale kcal in cima

Refactor `dispensa.aggiungi.tsx`:

- Aggiungo campo "Dispensa" (select)
- Aggiungo campo "Kcal per unità" (auto-calcolato dall'AI in `ai-parse-food`, modificabile)
- Bottone "Calcola kcal con AI" per alimenti aggiunti manualmente

Aggiorno `ai-parse-food`: schema include `kcal_per_unit` (stima per unità).

Nuova edge function `ai-calc-kcal` per calcolo singolo (input: nome+quantità+unità → kcal).

## 5. Suggerimenti prodotti (recommended_products)

Nuova sezione in `/spesa`:

- Card "Consigliati per te" sopra la lista, generati dall'AI in base a:
  - alimenti in scadenza
  - storico spesa
  - preferenze diete
- Bottone "Aggiungi alla lista" per ognuno
- Bottone "Rigenera suggerimenti" (chiama nuova edge function `ai-suggest-products`)

Nuova edge function `ai-suggest-products` (analoga a `ai-suggest-recipes` ma genera 5–8 prodotti consigliati con `name`, `category`, `reason`).

## 6. Counter spesa effettuata e budget rimanente (mini-dashboard nelle altre pagine)

In `/spesa`: card in alto con
- Spesa settimana: X €
- Budget settimanale: Y €
- Rimanente: Y - X € (verde se positivo, rosso se negativo)
- Barra progresso

## 7. Fix piano settimanale

Includo `prep_minutes` e `estimated_cost` negli `meal_plan_entries.notes` per mostrarli nel piano.

## Dettagli tecnici

```text
src/
├── routes/_app/
│   ├── home.tsx                ← NUOVO (dashboard)
│   ├── dispensa.tsx            ← multi-pantry, kcal, svuota
│   ├── dispensa.aggiungi.tsx   ← campo dispensa + kcal
│   ├── ricette.tsx             ← tabs salvate/personalizzate, fix like
│   ├── ricette.nuova.tsx       ← NUOVO (form ricetta personalizzata)
│   ├── spesa.tsx               ← suggeriti AI + dashboard budget
│   └── ...
├── components/
│   ├── AppShell.tsx            ← aggiunta tab Home
│   └── BudgetCard.tsx          ← NUOVO (riusabile)
└── lib/queries.ts              ← hooks pantries, savedRecipes, recommendedProducts

supabase/
├── migrations/                 ← nuova migration (pantries, kcal, tags, recommended_products)
└── functions/
    ├── ai-suggest-recipes/     ← passa feedback nel prompt
    ├── ai-parse-food/          ← restituisce kcal_per_unit
    ├── ai-calc-kcal/           ← NUOVA
    └── ai-suggest-products/    ← NUOVA
```

Tutti i nuovi RLS usano `is_household_member`. Gli aggiornamenti UI invalidano le query React-Query corrispondenti.

## Note

- Le ricette AI non vengono salvate finché l'utente non clicca "Salva" — risparmio storage
- Le 2 ricette rapide in home sono cachate per 24h in `localStorage` per evitare di bruciare crediti AI ad ogni apertura
- Il calcolo kcal è una **stima AI**, mostro un piccolo "~" davanti
