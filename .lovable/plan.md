## Problema

Quando un nuovo utente apre l'app, `ensureHousehold()` tenta:

```ts
supabase.from("households").insert({ owner_id, name }).select("id").single()
```

La policy SELECT attuale su `households` richiede `is_household_member(id, auth.uid())`, ma l'utente diventa membro **solo dopo** l'INSERT. Quindi il `RETURNING id` viola RLS e Postgres risponde 42501. Risultato: nessuna household creata → `current_household_id` = NULL → "profilo in preparazione, riprova più tardi" su Dispensa/Aggiungi, budget non salvabile, piano pasti non generabile.

Confermato in DB: il profilo `025ea0a0-…` ha `current_household_id = NULL` e zero righe in `household_members`. I log mostrano POST `/households` ripetuti con risposta 403 / `42501`.

## Fix

### 1. Migrazione SQL — estendere la policy SELECT su `households`

Sostituire la policy "Members view household" così che anche l'owner possa leggere la riga (necessario per l'INSERT … RETURNING e in generale corretto: il proprietario deve sempre poter vedere il proprio nucleo):

```sql
DROP POLICY IF EXISTS "Members view household" ON public.households;

CREATE POLICY "Members or owner view household"
ON public.households
FOR SELECT
USING (
  auth.uid() = owner_id
  OR public.is_household_member(id, auth.uid())
);
```

### 2. Riparazione dato utente attuale

L'utente `mangino.manuel2@gmail.com` (`025ea0a0-…`) è bloccato senza household. Dopo aver applicato la migration, all'avvio dell'app `ensureHousehold` riuscirà a crearla automaticamente — non servono interventi manuali sui dati.

### 3. Nessuna modifica al codice client

Il flusso in `src/lib/household.ts` è corretto una volta sistemata la RLS. Nessun altro file va toccato.

## Verifica post-deploy

1. Login con l'utente esistente → `households` viene creata, `household_members` popolata, `profiles.current_household_id` valorizzato.
2. `/dispensa/aggiungi` → l'aggiunta di un alimento funziona senza messaggio "profilo in preparazione".
3. Impostazioni → salvataggio budget settimanale ok.
4. Generazione piano pasti ok.
