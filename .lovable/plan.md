## Obiettivo

Sostituire l'attuale "Genera mese" (lento, generico, spesso fallisce) con un sistema flessibile a 3 livelli — **Giorno / Settimana / Mese** — sincronizzato con data e ora correnti e con suggerimenti personalizzati sulle preferenze utente.

## Cosa cambia per l'utente

Sulla pagina **Piano pasti**, il pulsante "Genera mese" diventa un menu con tre opzioni:

- **Genera giorno** — pianifica solo il giorno selezionato (default: oggi). Veloce (~5s).
- **Genera settimana** — pianifica i 7 giorni della settimana corrente partendo da oggi.
- **Genera mese** — pianifica tutti i giorni rimanenti del mese corrente.

Per ogni opzione l'utente può scegliere quali **slot** generare (Pranzo, Cena, o entrambi; opzionale Colazione/Spuntino).

Inoltre:
- Se un giorno ha già pasti pianificati, viene chiesto se **sovrascrivere o saltare** quei giorni.
- I giorni passati del mese non vengono toccati.
- Toast con riepilogo (es. "Pianificati 14 pasti dal 8 al 14 maggio").

## Personalizzazione AI

L'edge function `ai-suggest-recipes` riceverà nuovi parametri di contesto per generare suggerimenti molto più mirati:

- **Data e ora correnti** + **stagione** (primavera/estate/autunno/inverno) → ricette stagionali.
- **Giorno della settimana** per ogni pasto (es. domenica = piatto più elaborato, lunedì = veloce).
- **Slot** (colazione/pranzo/cena/spuntino) → tipo di piatto adeguato.
- **Storico ricette ultime 4 settimane** dal piano → evita ripetizioni.
- **Like/dislike** già presenti in `recipe_feedback`.
- **Dispensa con priorità scadenze** (già presente, viene mantenuto).
- **Preferenze utente complete**: diete, allergie, dislikes, obiettivi, persone, budget settimanale.
- **Varietà**: l'AI riceve istruzione esplicita di alternare proteine (carne/pesce/legumi/uova/vegetariano) e tipologie (pasta/riso/zuppa/insalata/secondo+contorno).

## Perché ora non funziona

L'attuale `generateMonth`:
1. Chiede 60+ ricette in una sola call → spesso timeout o risposta troncata.
2. Non passa `likes`/`dislikes` → suggerimenti generici.
3. Non considera giorno/stagione → propone risotti d'inverno a luglio.
4. Sovrascrive sempre senza chiedere.
5. Non distingue gli slot: assegna le stesse ricette a pranzo e cena indistintamente.

## Modifiche tecniche

### 1. `src/routes/_app/piano.tsx`
- Sostituire il pulsante "Genera mese" con un `DropdownMenu` con tre voci (Giorno / Settimana / Mese).
- Apertura di un `Dialog` di conferma con: range mostrato, checkbox slot (Pranzo/Cena/Colazione/Spuntino), radio "Sovrascrivi esistenti / Salta giorni già pianificati".
- Nuova funzione `generateRange(startDate, endDate, slots, overwrite)` che:
  - Filtra i giorni passati.
  - Per ogni giorno costruisce una richiesta separata con contesto data+slot.
  - Chiama l'edge function con batch più piccoli (1 giorno = 1 chiamata, oppure max 7 giorni per chiamata se slot ridotti).
  - Mostra `Progress` durante la generazione.
  - Dedup vs entries esistenti, ensurePlan per ogni week_start coinvolta.

### 2. `supabase/functions/ai-suggest-recipes/index.ts`
- Accettare nuovi campi nel body: `dateContext` (array di `{date, slot, dayName}`) e `recentTitles` (storico per evitare ripetizioni).
- Aggiornare il prompt di sistema per includere stagione, giorno settimana, slot, varietà proteine.
- Restituire ricette con campo `assigned_to: { date, slot }` per mappatura diretta.

### 3. Query helpers (`src/lib/queries.ts`)
- Aggiungere `useRecentMealEntries(hid, weeks=4)` per recuperare titoli recenti da passare all'AI.

Nessuna modifica al DB.

## Conferme richieste

Prima di scrivere codice vorrei conferma su:

1. **Slot di default**: generare solo Pranzo+Cena, oppure includere anche Colazione e Spuntino?
2. **Sovrascrittura**: confermo il comportamento "chiedi all'utente con default = salta giorni già pianificati"?
3. **Stagionalità**: vuoi ricette tipicamente italiane stagionali (es. ribollita d'inverno) o un mix più internazionale?
