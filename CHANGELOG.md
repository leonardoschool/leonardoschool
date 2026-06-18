# Changelog

Tutte le modifiche rilevanti al progetto sono documentate qui.

Il formato si basa su [Keep a Changelog](https://keepachangelog.com/it/1.1.0/)
e il progetto adotta il [Versionamento Semantico](https://semver.org/lang/it/) (`MAJOR.MINOR.PATCH`).
La versione è in `package.json` (`version`) ed è mostrata nel badge in basso a sinistra dell'app.

## [Non rilasciato]

## [1.0.0] - 2026-06-18

Prima versione tracciata: da qui in poi ogni modifica aggiorna versione e changelog.

### Aggiunto
- Supporto alle immagini inline nelle domande e nelle simulazioni, con resa ottimizzata anche in stampa.
- Gestione strutturata del nome (`firstName`/`lastName`) e snapshot del prezzo nei contratti.
- Onboarding lato admin: l'admin può attivare/disattivare l'account e assegnare/revocare i contratti **prima** che lo studente confermi il profilo; al primo accesso lo studente trova i dati anagrafici inseriti dall'admin **già precompilati** e modificabili. Resta invariata la registrazione autonoma.
- Badge di versione discreto nel frontend (in basso a sinistra), nascosto in stampa.

### Modificato
- Login: email e password vengono ripulite dagli spazi (`trim`) prima dell'invio a Firebase, risolvendo i casi "stesse credenziali, funziona da un dispositivo e non da un altro" causati da autofill/copia-incolla.

### Corretto
- Caricamento materiali in una cartella: `materials.createBatch` collegava la cartella con un campo `category` inesistente; ora usa correttamente la relazione molti-a-molti `categories` (`MaterialCategoryLink`).
- Rimossa una riassegnazione inutile di `globalQuestionNumber` nella stampa delle simulazioni (errore di lint che bloccava la build CI).

### Infrastruttura / Database
- Adozione delle **migrazioni Prisma**: creata la migrazione iniziale `0_init` e baseline di locale, test e produzione (Neon) senza perdita di dati.
- `prisma.config.ts` usa la connessione **diretta** di Neon (`DATABASE_URL_UNPOOLED`) per i comandi CLI, con fallback su `DATABASE_URL` in locale.
- Deploy automatico delle migrazioni su Vercel: `scripts/prisma-deploy.ts` esegue `prisma migrate deploy` **solo** nei build di produzione (mai in preview o in locale).
- Riparato `pnpm lint` in locale: reinstallato `@babel/core` (pacchetto corrotto nello store pnpm) e aggiunto come dipendenza esplicita.

[Non rilasciato]: https://github.com/marcimastro98/leonardoschool/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/marcimastro98/leonardoschool/releases/tag/v1.0.0
