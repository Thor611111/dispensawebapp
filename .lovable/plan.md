## Diagnosi

Il dev server era bloccato su una cache di route stantia che riferiva un file fantasma `_admin.index.tsx` (mai esistito su disco). Il file reale è `admin.index.tsx` (senza underscore) e non c'è alcun conflitto effettivo nei file sorgente:

```
src/routes/index.tsx        → /
src/routes/admin.tsx        → /admin (layout)
src/routes/admin.index.tsx  → /admin (figlio del layout)
src/routes/admin.utenti.tsx → /admin/utenti
src/routes/admin.log-email.tsx → /admin/log-email
```

Dopo il riavvio del dev server, il rigeneratore ha ricostruito correttamente `routeTree.gen.ts` e l'endpoint `/` risponde 200. **Il conflitto è risolto.**

## Azione proposta

Nessuna modifica al codice è necessaria. Procedo con questi passi di verifica:

1. Ricarica la preview (hard refresh: Ctrl/Cmd+Shift+R) per scaricare il nuovo bundle e cancellare l'errore "Failed to fetch dynamically imported module".
2. Apri `/home` come utente normale: deve caricare senza overlay di errore.
3. Apri `/admin` con il tuo account (`mangino.manuel@gmail.com`): deve mostrare l'overview admin (conteggi utenti/household/email).
4. Verifica le sotto-pagine `/admin/utenti` e `/admin/log-email`.

Se dopo l'hard refresh vedi ancora l'errore, lo diagnostico ulteriormente (probabile service worker o sessione preview cached).