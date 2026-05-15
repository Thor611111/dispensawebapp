
# Sprint 3 — Statistiche, riorganizzazione, restyling, fix

## 1. Riorganizzazione sezioni (cosa va dove)

Oggi `Spesa` mescola troppe cose (scontrino + budget + lista) e la `Home` duplica metriche. Nuovo modello:

| Tab | Ruolo | Contenuti |
|---|---|---|
| **Home** | dashboard giornaliera | saluto, scadenze imminenti, ricette rapide da dispensa, CTA piano di oggi, install card |
| **Dispensa** | inventario | lista food_items + filtri/ricerca/badge scadenza (P1 sprint 2 base, qui solo polish) |
| **Ricette** | catalogo | nessuna modifica strutturale |
| **Piano** | settimana | nessuna modifica strutturale |
| **Spesa** | flusso d'acquisto | lista spesa + scan scontrino + chiusura/storno (rimuove riassunto budget, va in Statistiche) |
| **Statistiche** *(NUOVA)* | analisi & budget | budget settimanale/mensile, grafici, forecast, top categorie, export |
| **Impostazioni** | invariata | |

Spostamenti chiave:
- **Home** perde i due budget bar duplicati (settimana+mese) → resta solo un mini-widget "Budget settimanale" con link a Statistiche.
- **Spesa** perde il blocco budget settimanale in cima (oggi righe 270-352) → resta solo "totale ultimo scontrino" e CTA chiusura.
- **Statistiche** centralizza budget editing (oggi sparso tra Home/Spesa/Impostazioni preferenze) e analisi.

Bottom nav resta a 6 voci ma sostituiamo l'ordine: Home · Dispensa · Piano · Spesa · Statistiche · Impostazioni (Ricette si raggiunge da Home/Piano, era poco usato come tab principale — alternativa: lasciamo Ricette e mettiamo Statistiche dentro Home come card link. Vedi nota in fondo.)

## 2. Pagina /statistiche (nuova)

File: `src/routes/_app/statistiche.tsx`. Stack: Recharts (già nel progetto via `src/components/ui/chart.tsx`).

Sezioni:
1. **Periodo selector** — Settimana / Mese / 3 mesi (tabs)
2. **KPI cards** — Speso, Budget, Δ vs periodo precedente, Forecast fine periodo
3. **Linea spesa cumulativa vs budget proiettato** — AreaChart con linea budget tratteggiata
4. **Top categorie** — BarChart orizzontale (deriva categoria da `food_items` matchati o da `expenses.note` parsed)
5. **Spesa per membro** — pie chart su `expenses.created_by` con join `profiles`
6. **Spesa per dispensa** — bar chart su `food_items.pantry_id`
7. **Insight forecast** — testo: "al ritmo attuale chiuderai il mese a X€ (±Y vs budget)"
8. **Export CSV** — download `expenses_YYYY-MM.csv` lato client
9. **Editor budget** — input weekly/monthly inline (sostituisce edit in altre pagine)

Tutto client-side: query esistenti `useExpenses` + nuove derivazioni con `useMemo`. Niente nuove edge function in questo sprint (anomaly AI rimandato a sprint successivo).

## 3. Restyling UI (più confortevole)

Cambi trasversali, no nuove dipendenze:
- **PageHeader**: aggiungere variante con sticky background + ombra leggera allo scroll, padding più ariato (oggi `mb-6`, passa a `mb-8` con divider sottile).
- **Card density**: passare da `p-6` a `p-5` su mobile per ridurre scroll, gap interni `gap-3`.
- **Bottom nav**: aggiungere pill attiva (background `primary/10` rounded) invece del solo cambio colore — più leggibile su mobile.
- **Empty states uniformi**: nuovo componente `<EmptyState icon title description action />` riusato in dispensa/piano/spesa/statistiche vuote.
- **Skeleton uniformi**: nuovo `<ListSkeleton rows={n} />` riusato al posto degli spinner sparsi.
- **Token colore semantici**: aggiungere in `styles.css` `--surface-elevated`, `--success`, `--warning`, `--danger` per badge scadenza coerenti (oggi mix verde/giallo/rosso hard-coded).
- **Type scale**: H1 `text-2xl`→ `text-[1.6rem]` con tracking ridotto, body `text-[0.95rem]`.
- **Transizioni soft** (`transition-colors duration-200`) su tab attivo, card hover.

## 4. Bug fix

Audit mirato durante l'implementazione:
- **Hook order** su `home.tsx`, `piano.tsx`, `ricette.tsx` (controllo già fatto su `dispensa.tsx`): assicurare che ogni `if (!hid) return` stia DOPO tutti gli `useState/useQuery/useMemo`.
- **Home `loadQuick`**: oggi cache key cambia ogni giorno e re-trigger ad ogni cambio `items.length` → throttle a 1 chiamata/giorno e niente refetch automatico se cache hit.
- **Spesa scan dialog**: `closeTab` rimane su "scan" anche dopo chiusura → reset a "total" su `onOpenChange(false)`.
- **`expenses` reset periodo** (Home): oggi cancella anche scontrini importati con prodotti già in dispensa → aggiungere conferma con conteggio "stai per cancellare N spese".
- **Budget UI**: mostra valori vuoti come "0,00" invece di nascondere la barra (UX sconcertante quando budget non impostato → CTA "Imposta budget").
- **Bottom nav `startsWith`**: `/dispensa` matcha anche `/dispensa/aggiungi` (ok) ma su Statistiche con `/spesa` rischio collisione futura — usare match esatto su tab base.

## File modificati / creati

```text
src/routes/_app/statistiche.tsx           (NEW)
src/components/EmptyState.tsx             (NEW)
src/components/ListSkeleton.tsx           (NEW)
src/components/AppShell.tsx               (nav restyle + Statistiche tab)
src/styles.css                            (token surface/success/warning/danger)
src/routes/_app/home.tsx                  (rimuovi duplicati, fix loadQuick, fix reset)
src/routes/_app/spesa.tsx                 (rimuovi budget block, fix closeTab reset)
src/routes/_app/dispensa.tsx              (badge scadenza con nuovi token)
src/routes/_app/impostazioni.preferenze.tsx (link a /statistiche per budget)
src/lib/queries.ts                        (helper aggregazioni statistiche)
```

## Note / decisione richiesta

**Bottom nav**: meglio (a) sostituire `Ricette` con `Statistiche` nella nav principale (Ricette resta accessibile da Home/Piano), oppure (b) tenere Ricette e mettere Statistiche solo come card nella Home? Procedo con **(a)** salvo diverso parere — è più coerente con un'app spese-prima.

## Ordine di esecuzione

1. Token CSS + componenti riusabili (EmptyState, ListSkeleton)
2. Pagina Statistiche con Recharts + export CSV
3. AppShell restyle + nuova tab
4. Cleanup Home + Spesa (sposta budget)
5. Bug fix mirati
6. QA visivo a 399x810 (viewport corrente)
