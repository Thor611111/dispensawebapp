
# PantryAI — MVP

Web app responsive installabile come PWA su iOS/Android. Assistente alimentare intelligente che gestisce dispensa, ricette, piano pasti settimanale, lista spesa e budget, con condivisione famiglia.

## Esperienza utente

Design pulito, mobile-first, pochi tap per completare ogni azione. Ogni schermata mostra solo l'essenziale. L'app propone sempre una scelta automatica, l'utente conferma o modifica.

## Funzionalità incluse nell'MVP

### 1. Onboarding rapido
- Registrazione con email/password o Google
- Setup guidato: composizione nucleo (singolo/coppia/famiglia), diete, allergie, intolleranze, obiettivi (sano / economico / veloce), budget settimanale
- Creazione automatica di un "Nucleo" (household) condivisibile

### 2. Dispensa
- Vista unica con filtri rapidi: Frigo, Freezer, Dispensa, Altro
- Indicatore visivo per alimenti in scadenza (oggi / 3 giorni / settimana)
- Inserimento alimento:
  - **Manuale veloce** con autocompletamento da catalogo alimenti (categoria, unità, durata tipica suggerite)
  - **Foto AI**: l'utente fotografa scontrino o frigo aperto, l'AI estrae lista alimenti pre-compilata da confermare con un tap
  - **Testo libero AI**: incolla/dettatura ("2 mele, latte, 500g pasta") → l'AI struttura tutto
- Ogni alimento ha: nome, quantità, unità, posizione, scadenza stimata (auto), prezzo (auto da media o inserito)
- Modifica/elimina veloci con swipe

### 3. Ricette
- Catalogo ricette di base + possibilità di aggiungerne proprie o da link/URL (l'AI estrae ingredienti e passi)
- Suggerimenti automatici "Cosa cucino oggi?" ordinati per: ingredienti già in dispensa, scadenze imminenti, dieta, costo, tempo
- Ogni suggerimento mostra il **motivo** ("Usa lo yogurt che scade domani, 12 min, ~3,40 €")
- Filtri rapidi: tempo, difficoltà, costo, vegetariano/vegano, ecc.
- Dettaglio ricetta: ingredienti spuntabili, mancanti aggiungibili alla lista spesa, passi numerati

### 4. Piano pasti settimanale
- Generazione automatica del menu della settimana con un tap
- Rispetta dieta, allergie, budget, varietà, scadenze
- Vista calendario settimanale (colazione opzionale / pranzo / cena)
- Sostituzione di un singolo pasto con un nuovo suggerimento
- Spiegazione del piano ("Questo piano costa ~42 € e usa l'80% di ciò che hai già")

### 5. Lista spesa
- Generata automaticamente dal piano pasti meno la dispensa attuale
- Raggruppata per reparto (Frutta/Verdura, Latticini, ecc.)
- Spunta articoli; alla conferma "Spesa fatta" gli articoli entrano in dispensa con prezzi
- Stima costo totale aggiornata in tempo reale

### 6. Budget e spese
- Dashboard semplice: budget settimanale/mensile, speso, rimanente
- Storico spesa per settimana/mese con grafico
- Avviso quando il piano pasti supera il budget; suggerimento di alternative più economiche

### 7. Apprendimento preferenze
- Pulsanti "Mi piace / No grazie / Mai più" su ogni ricetta
- Le ricette rifiutate vengono proposte meno; quelle apprezzate più spesso
- Preferenze modificabili dalle impostazioni

### 8. Account e condivisione famiglia
- Ogni utente ha un account; appartiene a uno o più Nuclei
- Invito membri via link/email: tutti i membri vedono e modificano la stessa dispensa, piano pasti, lista spesa, budget
- Sincronizzazione real-time tra dispositivi

### 9. PWA
- Installabile su iOS e Android dalla home (Add to Home Screen)
- Layout responsive ottimizzato mobile

## Fuori scope MVP (fasi successive)
- Scansione codici a barre con database alimenti EAN
- App native iOS/Android (wrapper Capacitor)
- Notifiche push per scadenze
- Integrazione supermercati per prezzi reali
- Riconoscimento immagini frigo avanzato (oltre estrazione testo)

## Struttura schermate

```
/                       Landing pubblica + CTA login
/login, /signup         Auth
/onboarding             Setup guidato (multi-step)
/dispensa               Lista con filtri + tasto "+"
/dispensa/aggiungi      Manuale / Foto AI / Testo AI
/ricette                Suggerimenti del giorno + esplora
/ricette/:id            Dettaglio ricetta
/piano                  Piano settimanale
/spesa                  Lista spesa
/budget                 Dashboard economica
/impostazioni           Profilo, dieta, allergie, nucleo, inviti
```

## Stack tecnico

- **Frontend**: TanStack Start (React + SSR) con routing per pagina, Tailwind, shadcn/ui, PWA manifest installabile
- **Backend**: Lovable Cloud (Supabase) — auth email+Google, database Postgres con RLS, storage per foto scontrini, realtime per sync famiglia
- **AI**: Lovable AI Gateway (Gemini 3 Flash di default) per:
  - estrazione alimenti da foto scontrino/frigo (multimodale)
  - parsing testo libero in alimenti strutturati
  - generazione piano pasti con vincoli (dieta, budget, scadenze)
  - estrazione ricetta da URL
  - spiegazione delle scelte
- **Modello dati principale**: households, household_members, food_items, recipes, user_recipes, meal_plans, meal_plan_entries, shopping_list_items, expenses, user_preferences, recipe_feedback
- **Sicurezza**: RLS basato su appartenenza al household; ruoli utente in tabella separata `user_roles`

## Note

- Nessuna dipendenza native richiesta
- Costi AI a consumo (gratis fino a soglia mensile, poi a credito Lovable)
- Dopo l'MVP possiamo aggiungere barcode scanning e build native con Capacitor
