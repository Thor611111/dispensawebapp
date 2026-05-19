## Sincronizzazione del Piano pasti con Google Calendar / Calendario iOS

### Approccio consigliato: feed ICS + download .ics

Invece di integrare singolarmente Google Calendar API (richiederebbe OAuth per-utente, schermata di consenso Google, gestione token, e non risolverebbe iOS), uso lo standard **iCalendar (.ics)** che funziona nativamente sia con Google Calendar sia con il Calendario di iOS/macOS, senza login né configurazioni esterne.

Due modalità complementari:

1. **Abbonamento (feed live)** — l'utente sottoscrive un URL `webcal://` e ogni modifica al piano pasti si riflette nel suo calendario entro qualche ora (Google: ogni 8-24h, iOS: configurabile fino a "ogni 15 min").
2. **Download singolo (.ics)** — pulsante "Aggiungi al calendario" su un pasto/giorno/settimana che scarica un file `.ics` aprendolo direttamente nell'app calendario.

### Cosa cambia

**Frontend — `/_app/piano.tsx`**
- Pulsante "Sincronizza con calendario" che apre un dialog con:
  - URL del feed `webcal://pantryai.it/api/public/calendar/<token>.ics` con bottone "Copia"
  - Bottoni rapidi: "Apri in Google Calendar" (link `https://calendar.google.com/calendar/r?cid=...`) e "Apri in Calendario iOS" (link `webcal://...` → iOS chiede conferma di abbonamento)
  - Spiegazione breve "Gli aggiornamenti al piano arriveranno automaticamente"
- Su ogni entry e nel drawer del giorno: icona "Aggiungi al calendario" che scarica `.ics` del singolo pasto

**Frontend — `/_app/impostazioni`**
- Nuova voce "Sincronizzazione calendario" per gestire/rigenerare il token e scegliere durata pasto di default (30/60/90 min) e orari standard (colazione 08:00, pranzo 13:00, cena 20:00, snack 17:00).

**Backend — server functions + route pubblica**
- `src/lib/calendar.functions.ts` (server fn protette):
  - `getCalendarToken()` → restituisce/crea il token corrente dell'utente
  - `regenerateCalendarToken()` → invalida il vecchio (se lo condividi per errore)
- `src/routes/api/public/calendar/$token.ts` (route pubblica, no auth):
  - Risolve token → household
  - Legge `meal_plan_entries` delle ultime 4 settimane + future
  - Costruisce ICS con `BEGIN:VEVENT` per ogni pasto, con `UID` stabile per consentire l'aggiornamento (no duplicati), `DTSTART` calcolato da `day_date` + slot, `SUMMARY` "🍽 {ricetta}", `DESCRIPTION` con note + ingredienti, `LOCATION` "Casa"
  - Header `Content-Type: text/calendar; charset=utf-8` + cache 10 min
- `src/routes/api/public/calendar/event.$entryId.ics.ts` (one-shot, richiede token in query string)

### Database (1 migrazione)

Nuova tabella `calendar_tokens`:
- `user_id`, `household_id`, `token` (text random 32 byte, indicizzato unique), `default_meal_minutes` int, `breakfast_time`/`lunch_time`/`dinner_time`/`snack_time` time, `created_at`, `last_accessed_at`
- RLS: l'utente vede/aggiorna solo la propria riga; la route pubblica usa `supabaseAdmin` per risolvere il token.

### Cosa NON faccio (e perché)

- **No Google Calendar API diretta**: richiederebbe OAuth per-utente con Google Cloud Console, gestione refresh token, ban se la verifica del consent screen non passa. Non porta benefici reali rispetto a ICS visto che basta cliccare "Aggiungi a Google Calendar" sul nostro link `cid=`.
- **No EventKit iOS**: serve un'app nativa. Su PWA si usa esattamente ICS.

### Aspetti UX

- iOS richiede la conferma esplicita dell'abbonamento (è lo standard del sistema, non bypassabile).
- Google Calendar mostra "Aggiungi calendario" → conferma → comparirà sotto "Altri calendari".
- I refresh non sono istantanei (limite degli aggregatori); per modifiche immediate l'utente può sempre scaricare il singolo `.ics` aggiornato.

### Piano di esecuzione

1. Migrazione `calendar_tokens` + RLS
2. `src/lib/calendar.functions.ts` (token CRUD)
3. `src/routes/api/public/calendar/$token.ts` (feed ICS) + builder ICS
4. UI nel piano (`/_app/piano.tsx`): dialog "Sincronizza calendario" + pulsante "Aggiungi al calendario" per singolo pasto
5. UI in impostazioni: gestione token + orari default

Stimo ~1 turno per tutto. Confermami e procedo, oppure dimmi se preferisci che integri SOLO il download `.ics` per singolo pasto (più semplice, niente tabella nuova) prima del feed completo.