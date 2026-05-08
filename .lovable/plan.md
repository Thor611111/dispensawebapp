
# Piano di lavoro — 5 fasi incrementali

Ho ordinato gli interventi dal **meno rischioso al più complesso**, in modo che ogni fase sia stabile prima di passare alla successiva. Ogni fase è auto-consistente e rilasciabile.

---

## Fase 1 — Auth, Profilo → Impostazioni, Home personalizzata

**Obiettivo**: ripulire l'esperienza di base prima di toccare la logica.

- **Registrazione** (`/signup`): aggiungere campo "Conferma password" con validazione match + icona occhio (show/hide) su entrambi i campi password. Stessa icona anche su `/login` e `/reset-password`.
- **Home**: mostrare il nome dell'utente in alto ("Ciao, Manuel 👋") leggendolo da `profiles.display_name`.
- **Profilo → Impostazioni**: rinominare la voce di menu e ristrutturare la pagina con sottosezioni navigabili:
  - Profilo (nome, email, avatar)
  - Casa & membri (vedi Fase 4)
  - Notifiche (vedi Fase 5)
  - Preferenze alimentari (diete, allergie, budget — già esistenti)
  - Scadenze & soglie (vedi Fase 2)
  - Esci / Elimina account
- **Quick actions home**: aggiungere shortcut a Piano e Lista spesa accanto a Dispensa/Ricette/Spesa.

---

## Fase 2 — Dispensa intelligente & scadenze

**Obiettivo**: rendere visibili e gestibili i prodotti in scadenza.

- **Card "In scadenza" sulla home**: mostrare numero prodotti + grammatura totale (es. "3 prodotti · 540 g"), cliccabile → porta a `/dispensa?filter=expiring`.
- **Sezione "In scadenza" nella Dispensa**: tab/accordion in cima con i prodotti che scadono entro N giorni, ordinati per urgenza, con azioni rapide (consuma, butta, aggiungi a spesa).
- **Soglia personalizzabile**: in Impostazioni → Scadenze, slider "Avvisami N giorni prima" (default 3), salvato in `user_preferences`.
- **Tecnico**: aggiungere campo `expiry_warning_days` a `user_preferences` via migrazione.

---

## Fase 3 — Piano mensile, modifica per giorno, spesa generata dal piano

**Obiettivo**: il cuore della richiesta. Trasformare il piano da settimanale a mensile, persistente e azionabile.

- **Vista mensile** in `/piano`:
  - Header con data completa ("Maggio 2026") e navigazione ◀ / ▶ tra mesi (illimitato avanti/indietro).
  - Toggle Mese / Settimana / Giorno.
  - Calendario mensile con anteprima pasti per giorno.
- **Modifica per giorno**: tap su un giorno → drawer con pranzo + cena, possibilità di:
  - Sostituire ricetta (cerca tra ricette utente + sistema)
  - Generare alternativa con AI
  - Aggiungere note
  - Cancellare il pasto
- **Storico persistente**: ogni `meal_plan` resta salvato; l'utente può navigare mesi passati e pianificare mesi futuri.
- **Genera spesa dal piano** (azione chiave):
  - Pulsante "Aggiungi ingredienti mancanti alla lista spesa" sul piano (settimana o mese).
  - Edge function che: estrae ingredienti dalle ricette del periodo → confronta con `food_items` (dispensa) considerando quantità → aggiunge solo i mancanti/insufficienti a `shopping_list_items` evitando duplicati.
- **Tecnico**: nuova edge function `ai-plan-to-shopping`; estensione `meal_plan_entries` con eventuale `recipe_id` reale per recuperare ingredienti.

---

## Fase 4 — Casa condivisa (multi-utente)

**Obiettivo**: due o più account sulla stessa casa, dispense condivise.

- **Sezione "Casa & membri" in Impostazioni**:
  - Lista membri con ruolo
  - Genera codice invito (riusa `household_invites` esistente) condivisibile (copia link / share nativo)
  - Invia invito via email (template auth dedicato, infrastruttura email già presente)
  - Pagina `/join/:code` per accettare invito (anche da non registrati: signup → join automatico)
- **Card sulla home**: "La tua casa" con avatar dei membri + CTA "Invita qualcuno" se sei solo.
- **Selettore casa** in alto se l'utente appartiene a più nuclei (es. casa + casa genitori).
- **RLS**: già pronte (basate su `is_household_member`), nessuna modifica.

---

## Fase 5 — Notifiche (Web Push + Email)

**Obiettivo**: l'app raggiunge l'utente senza essere aperta.

- **Web Push (PWA)**:
  - Service worker (richiede di estendere il manifest già esistente)
  - Subscription salvata in nuova tabella `push_subscriptions`
  - Funziona su Android/desktop e su iOS solo se app installata in home
- **Email** (fallback + canale principale su iOS non installato): template "Promemoria scadenze" e "Piano della settimana pronto".
- **Cron** (`pg_cron` + endpoint `/api/public/hooks/notifications`):
  - Ogni mattina alle 9: scadenze imminenti → push + email
  - Ogni domenica sera: ricorda di pianificare la settimana
- **Impostazioni → Notifiche**: toggle per categoria (scadenze, piano, suggerimenti), canale preferito (push/email/entrambi), orario preferito.
- **Tecnico**: tabelle `push_subscriptions`, `notification_preferences`; secret `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` da generare.

---

## Lista spesa AI generata (incluso nella Fase 3)

Nella pagina `/spesa` aggiungo un pulsante "Genera con AI" con due modalità:
1. **In base ai tuoi gusti** — usa preferenze, allergie, ricette più usate (`recipe_feedback` like) e ricette frequenti del piano storico.
2. **In base al piano** — estrae dal piano corrente (settimana/mese) gli ingredienti mancanti.

---

## Funzioni extra suggerite (da confermare, non incluse di default)

Per rendere l'esperienza ancora più automatica, posso aggiungere in seguito:
- **Scan scontrino** già presente (`ai-scan-receipt`) — esporlo meglio come quick action su home.
- **Suggerimento "Cosa cucino oggi"** sulla home basato su scadenze imminenti.
- **Spreco evitato**: contatore € risparmiati consumando prodotti in scadenza.
- **Riordino automatico**: prodotti finiti in dispensa → suggerimento aggiunta a spesa.
- **Modalità offline** della dispensa (richiede service worker, in arrivo con Fase 5).

---

## Note tecniche

- Il database ha già: `households`, `household_members`, `household_invites`, `meal_plans`, `meal_plan_entries`, `shopping_list_items`, `food_items`, `recipes` con RLS corrette → la maggior parte del lavoro è frontend + edge functions, poche migrazioni.
- Email infra già configurata (pgmq + cron) → riusabile per notifiche email.
- PWA manifest già presente → estendere con service worker per push.

---

**Procedo con la Fase 1?** Le fasi successive seguono nello stesso ordine, una alla volta, così verifichiamo insieme che tutto funzioni prima di andare avanti.
