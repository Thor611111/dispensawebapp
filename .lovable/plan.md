# Revisione pagine e interfaccia

Obiettivo: ogni pagina ha un ruolo chiaro, niente doppioni, gerarchia visiva più calma e leggibile su mobile.

## Audit per pagina (cosa tengo / cosa tolgo)

### Home — dashboard veloce
- TIENE: saluto, widget budget (link a Stats), tile "In scadenza ≤3g", alert scadenze, ricette rapide AI, scorciatoia admin.
- TOGLIE: tile duplicato "Speso questa settimana" (è già nel widget budget) e griglia 5-icone (Dispensa/Ricette/Piano/Spesa/Stats) che duplica la bottom nav.
- AGGIUNGE: una sola riga "Azioni rapide" con 2 CTA contestuali — "Aggiungi alimento" e "Scansiona scontrino".

### Dispensa — inventario
- TIENE: filtro Tutto/In scadenza, switch dispense, filtro location, lista con stepper qty, badge scadenza, storno, elimina, svuota.
- TOGLIE: bottone "Ricalcola kcal" per riga (raro, sposta in detail / menu). Rimuove subtitle con kcal totali (rumore numerico).
- MIGLIORA: action per riga in un menu "⋯" invece di 3 icone affiancate → riga più pulita; sticky filter bar.

### Spesa — acquisto
- TIENE: lista articoli, aggiungi rapido, scansione scontrino, chiusura con totale, "Dal piano", storico.
- TOGLIE: card "Consigliati per te" (AI products) — duplica funzionalità di Piano/Dispensa, raramente azionata; spostata sotto un toggle/accordion "Suggerimenti AI".
- TOGLIE: select dispensa di destinazione sempre visibile → solo quando ci sono >1 dispense, compatto.

### Piano — calendario pasti
- TIENE: vista mese, generazione giorno/settimana/mese, drawer giorno, sposta/sostituisci ricetta, genera spesa da piano.
- TOGLIE: niente, ma compatta header (un solo blocco generazione invece di pulsanti sparsi).

### Ricette — libreria
- TIENE: lista salvate, importa/nuova, dettaglio.
- VALUTA: rimozione tab/filtri poco usati (verifico in implementazione).

### Statistiche — analisi
- TIENE: KPI, area chart cumulato, top categorie, per dispensa/membro, export CSV, editor budget inline, forecast.
- MIGLIORA: ordine sezioni (KPI → trend → categorie → forecast → export), tipografia più calma.

### Impostazioni — invariata (già a livelli)

## Restyling globale (confortevole)

1. **Densità**: `PageHeader` con padding ridotto su mobile; card `p-4` invece di `p-5/6` dove ridondante.
2. **Tipografia**: H1 `text-2xl` (era 1.6rem), subtitle `text-[13px]`, niente uppercase tracking sparso.
3. **Spaziature**: gap verticale uniforme `space-y-3` tra blocchi pagina.
4. **Bottom nav**: pill attiva con `bg-primary text-primary-foreground` (più leggibile del `bg-primary/10`), label sempre visibili.
5. **PageHeader sticky** opzionale su pagine lunghe (Dispensa, Piano).
6. **Colori semantici**: usare `--color-danger/warning/success` già definiti, sostituire `text-amber-500` hardcoded in Dispensa.

## Bug fix mirati
- Dispensa: tab "In scadenza" usa `warnDays` ma contatore home usa `3` fisso → allineo entrambi a `prefs.expiry_warning_days`.
- Spesa: `void expenses` rimosso, riordino import non usati (`Receipt`, `CheckCircle2`, `HelpCircle`, `PackagePlus`, `AlertTriangle` se non più referenziati dopo edit).
- Home: tile "speso settimana" rimosso elimina anche `weekSpent` se non più usato.

## File da toccare
- `src/components/AppShell.tsx` (nav + header)
- `src/routes/_app/home.tsx`
- `src/routes/_app/dispensa.tsx`
- `src/routes/_app/spesa.tsx`
- `src/routes/_app/piano.tsx` (solo header compatto)
- `src/routes/_app/statistiche.tsx` (riordino)
- `src/styles.css` (eventuale token spacing)

## Fuori scope
- Nuove feature business (notifiche push, condivisione liste, OCR alternativo).
- Modifiche schema DB.
- Refactor edge function.

Confermi e procedo? Se vuoi modificare scope (es. tenere "Consigliati per te" in Spesa, o non toccare Piano), dimmelo prima di partire.
