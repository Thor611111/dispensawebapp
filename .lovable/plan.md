## Obiettivo

Collegare strettamente **Ricette ↔ Piano ↔ Spesa ↔ Dispensa** così come oggi spesa è già collegata al piano. Rendere l'esperienza "smart": ogni pasto pianificato deve poter essere sostituito (con una ricetta salvata o con una rigenerazione AI puntuale), e la sezione Ricette deve diventare un cruscotto operativo che mostra cosa cucinare oggi/domani con segnali visivi su scadenze e ingredienti mancanti.

## Cosa cambia per l'utente

### 1. Piano pasti — pasti modificabili e rigenerabili
Nel `DayDrawer` (sezione Piano), ogni pasto avrà tre azioni:
- **Sostituisci da Ricette**: apre un picker con le ricette salvate (search + filtro per slot/tempo). Click → aggiorna `recipe_title_snapshot` e collega `recipe_id`.
- **Rigenera con AI**: chiama `ai-suggest-recipes` per **un solo slot** con il contesto (data, slot, dispensa, like/dislike, recentTitles esclusi quello corrente). Sostituisce l'entry.
- **Modifica manuale** (titolo/note) come oggi.

Aggiungo anche un'icona di stato per ogni entry:
- 🟢 verde se TUTTI gli ingredienti della ricetta sono in dispensa
- 🟡 giallo se mancano ingredienti (con tooltip che li elenca + bottone "→ Spesa")
- ⏰ icona scadenza se la ricetta usa prodotti che scadono entro `expiry_warning_days`

### 2. Sezione Ricette — nuovo tab "Oggi & Domani"
Aggiungo un primo tab "**Da cucinare**" (default) che mostra:
- I pasti pianificati di **oggi** e **domani**, raggruppati per giorno e slot.
- Per ogni pasto:
  - Titolo + slot (Pranzo/Cena/…)
  - Badge **🥬 Usa scadenze** se almeno un ingrediente è in dispensa con scadenza ≤ N giorni
  - Badge **🛒 Mancano N ingr.** se mancano ingredienti, cliccabile per aggiungerli alla spesa
  - Bottoni: "Apri ricetta", "Sostituisci", "Rigenera"
- Se non c'è nulla pianificato → CTA "Genera oggi" che apre il dialog di generazione del Piano.

I tab esistenti diventano: **Da cucinare** | Suggerite | Salvate | Mie.

### 3. Sostituzioni cross-section
- Dalla sezione **Ricette → Salvate**, ogni ricetta avrà un bottone "**Aggiungi al piano**" (scegli giorno + slot in popover).
- Da **Ricette → Suggerite** (AI), oltre a "Salva" e "Mancanti → spesa", aggiungo "**Pianifica**" (giorno + slot).
- Dalla **Spesa**, quando un articolo viene marcato comprato, già va in dispensa: nessuna modifica qui — ma le icone di stato in Piano/Ricette si aggiornano automaticamente perché derivate da `food_items`.

### 4. Smart helpers (nuovo file `src/lib/recipe-status.ts`)
Funzione pura `getRecipeStatus(ingredients, foodItems, warningDays)` → `{ missing: string[], expiringUsed: string[], allInPantry: boolean }`. Usata da Piano, Ricette, e badge sui pasti.

### 5. Shortcut esistenti mantenuti e resi visibili
- Dalla sezione Ricette aggiungo nella header una riga di shortcut: **📷 Scan codice a barre** (porta a `/dispensa/aggiungi` con scanner aperto) e **🧾 Scan scontrino** (apre il dialog "Chiudi spesa" della pagina Spesa). Sono funzioni che già esistono ma oggi sono nascoste — le rendiamo "smart" mettendole nei punti di flusso giusti.

## Modifiche tecniche

### File modificati

**`src/routes/_app/piano.tsx`** — `DayDrawer`:
- Aggiungere stato `replacing: entryId | null` e `picker: "saved" | "ai" | null`.
- Nuovo sub-componente `<EntryActions>` con 3 bottoni (Sostituisci / Rigenera / Elimina).
- `<RecipePickerDialog>`: lista ricette salvate (`useSavedRecipes`) con search; on-select chiama UPDATE su `meal_plan_entries`.
- `regenerateOne(entry)`: invoca `ai-suggest-recipes` con `slotsPlan: [{date, slot, dayName, weekend}]`, `recentTitles` (esclude entry corrente), `likes`, `dislikes`. Aggiorna l'entry esistente.
- Aggiungere icona stato per ogni entry usando `getRecipeStatus` su `(entry.recipe_id ? recipes_ingredients : [])`.

**`src/routes/_app/ricette.tsx`**:
- Aggiungere tab `"today"` come default. Query `useUpcomingMeals(hid, todayStr, tomorrowStr)` che legge `meal_plan_entries` con join su `recipes(*, recipe_ingredients(*))`.
- Per ogni meal: render con badge stato (mancanti/scadenze) e azioni (Sostituisci, Rigenera, Mancanti→spesa).
- Header: riga di shortcut con `Link` a `/dispensa/aggiungi?scan=1` e bottone che dispatcha evento per aprire il dialog scontrino in `/spesa` (oppure `Link to="/spesa?scan=1"`).
- Nei tab "Salvate" e "Suggerite" aggiungere bottone "Pianifica" che apre un piccolo Popover (date picker minimale + select slot) e fa ensurePlan + insert in `meal_plan_entries`.

**`src/lib/queries.ts`**:
- Nuova `useUpcomingMeals(hid, fromDate, toDate)` che ritorna entries con `recipes(*, recipe_ingredients(*))`.
- Nuova `useRecentMealEntries(hid, weeks=4)` (già citata in piani precedenti, conferma utility).

**`src/lib/recipe-status.ts`** (nuovo):
```ts
export function getRecipeStatus(
  ingredients: { name: string }[],
  foodItems: { name: string; expires_on: string | null }[],
  warningDays: number
): { missing: string[]; expiringUsed: string[]; allInPantry: boolean }
```

**`src/routes/_app/spesa.tsx`**: piccolo update — accettare query param `?scan=1` per aprire automaticamente il dialog "Chiudi spesa" allo scontrino.

**`src/routes/_app/dispensa.aggiungi.tsx`**: accettare `?scan=1` per aprire direttamente il barcode scanner (se esiste; altrimenti già pronto via stato esistente).

### Edge functions
Nessuna modifica strutturale a `ai-suggest-recipes` — viene già richiamata con `slotsPlan` di lunghezza 1 nel caso "rigenera singolo". Verifico solo che il fallback `dislikes`/`likes` sia case-insensitive.

### Database
Nessuna migrazione necessaria — `meal_plan_entries.recipe_id` esiste già; lo collegheremo quando si sostituisce con una ricetta salvata.

## Note

- I badge di stato sono calcolati lato client (zero round-trip extra) leggendo `food_items` già in cache.
- La rigenerazione singola riusa il batching esistente (BATCH=7) con array di 1 elemento → ~3-5s.
- Tutte le mutazioni invalidano le query corrette (`plan-month`, `mealplan`, `shopping`, `food`).
