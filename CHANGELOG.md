# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project follows [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).
The version lives in `package.json` (`version`) and is shown by the badge at the bottom-left of the app.

## [Unreleased]

## [1.14.7] - 2026-07-13

### Fixed
- **Ordinamento per cognome coerente ovunque.** L'ordinamento per cognome della Virtual Room e del registro presenze ora ricava il cognome con la stessa logica della pagina Utenti (gestione delle particelle nobiliari, es. *De Luca*, *Della Valle*): prima uno studente "Matteo De Luca" senza cognome strutturato finiva sotto la **L** in questi elenchi ma sotto la **D** in Utenti. Corretto anche lo split del nome quando è composto solo da particella + cognome (es. *De Luca* senza nome proprio) e l'**iniziale dell'avatar** nella lista Utenti, che ora corrisponde al cognome mostrato.

## [1.14.6] - 2026-07-13

### Fixed
- **Anteprima risposte/spiegazioni: ora appare anche con solo LaTeX.** Nell'editor delle domande l'anteprima formattata di una risposta (o di una spiegazione) compariva solo se il testo conteneva `$...$` o un tag HTML; una formula scritta con i delimitatori LaTeX `\(...\)` o `\[...\]` (es. `20\(\sqrt{\frac{2}{8-\pi}}\)`) non attivava l'anteprima. Ora il riconoscimento include anche le formule `\(...\)`/`\[...\]` e i comandi LaTeX con backslash, quindi l'anteprima appare in tutti i casi renderizzabili.

## [1.14.5] - 2026-07-13

### Changed
- **Materiali: rimosso il badge di difficoltà dagli argomenti.** Nell'elenco degli argomenti per materia non viene più mostrata l'etichetta di difficoltà (es. "Medio") accanto al nome. Il campo non aveva alcun effetto funzionale (le simulazioni usano la difficoltà della singola **domanda**, non quella dell'argomento), quindi il badge risultava solo fuorviante.

## [1.14.4] - 2026-07-13

### Changed
- **Registro presenze: nominativi come "Cognome Nome".** Nel registro presenze gli studenti erano già ordinati per cognome, ma il nome mostrato come "Nome Cognome" faceva sembrare l'elenco disordinato. Ora il nominativo è visualizzato con il **cognome prima del nome**, così l'ordine alfabetico per cognome è immediatamente leggibile (riconosce anche i cognomi composti, es. *De Luca*).

## [1.14.3] - 2026-07-13

### Fixed
- **Gestione Utenti: l'ordinamento per cognome ora funziona davvero.** L'elenco veniva di fatto ordinato per **nome** (i campi strutturati `firstName`/`lastName` sono vuoti per la maggior parte degli utenti, quindi l'ordinamento a livello di database ricadeva sul nome completo). Ora il cognome viene ricavato dal nome completo e l'ordinamento — sia predefinito per ruolo sia cliccando su *Utente* — è realmente **alfabetico per cognome**, applicato all'intero elenco. Riconosce anche i **cognomi composti** con particelle (es. *De Luca*, *Di Maria* ordinati sotto la D/Di).

### Changed
- **Gestione Utenti: nome mostrato come "Cognome Nome".** Nella colonna *Utente* il nominativo è ora visualizzato con il **cognome prima del nome**, così il cognome resta leggibile anche quando la cella viene troncata (prima nomi lunghi come "Gianluca Francesco Paolo …" nascondevano il cognome).

## [1.14.2] - 2026-07-13

### Changed
- **Template Contratti: ordinamento predefinito A→Z.** L'elenco dei template si apre ora ordinato **alfabeticamente per nome** (A→Z) invece che per "Più recenti". Le altre opzioni di ordinamento (Z→A, Più recenti, Più vecchi) restano disponibili dal menu.
- **Registro presenze ordinato per cognome.** Nel registro presenze di un evento gli studenti sono ora elencati in ordine **alfabetico per cognome**, coerentemente con la Virtual Room e la pagina Utenti (prima seguivano l'ordine degli inviti/gruppi).

## [1.14.1] - 2026-07-13

### Fixed
- **Immagini delle risposte a scelta multipla ora sempre visibili.** Le risposte con immagine salvata solo come percorso Firebase (`imageStoragePath`, senza `imageUrl`) non venivano mostrate durante la simulazione. Ora la query dello studente include `imageStoragePath` e i renderer (standard e TOLC) risolvono l'immagine con fallback `imageUrl → imageStoragePath`. Le immagini delle risposte compaiono inoltre nel **dettaglio domanda** (pagina admin), dove prima erano del tutto assenti.

### Infrastructure
- **Riparazione contenuti domande CINECA (dati di produzione, 13/07/2026).** Nuovo script `scripts/fix-cineca-question-content.ts` (diagnostica in dry-run + riparazione con `--run`). Eseguito su produzione: **376 domande a due figure** hanno recuperato la seconda immagine inline (tabella/figura) che veniva persa (caso *"parte mancante nella domanda"*), **405** riferimenti inline riscritti con URL firmati e **187** duplicati rimossi; **9** domande etichettate IT ma con testo inglese rietichettate come EN. Restano da sistemare a mano **2** file immagine assenti dallo Storage e **4** domande con opzioni placeholder senza figura.

## [1.14.0] - 2026-07-13

### Added
- **Gestione Utenti: tabella ordinabile.** Le colonne **Utente**, **Ruolo** e **Registrazione** ora sono cliccabili per ordinare la tabella; un secondo click inverte la direzione (crescente/decrescente). L'ordinamento viene applicato all'intero elenco, non solo alla pagina visibile.
- **Ordinamento predefinito per ruolo.** All'apertura la lista è ordinata per ruolo — prima gli **studenti**, poi i **collaboratori**, infine gli **admin** — e in ordine **alfabetico per cognome** all'interno di ciascun gruppo. Restano disponibili tutti i filtri esistenti (ricerca per nome/email, filtro per ruolo e per stato), combinabili con l'ordinamento.

## [1.13.1] - 2026-07-13

### Fixed
- **Virtual Room: le card degli studenti non si spostano più.** Nel prospetto dei partecipanti le card cambiavano continuamente posizione a ogni aggiornamento in tempo reale, rendendo difficile leggere le segnalazioni. Ora i partecipanti sono ordinati **alfabeticamente per cognome** e mantengono un ordine **stabile** tra un aggiornamento e l'altro (a parità di cognome l'ordine resta comunque deterministico).

## [1.13.0] - 2026-07-07

### Added
- **Log Errori centralizzato.** Nuova pagina admin **`/log-errori`** (menu *Gestione → Log Errori*) che raccoglie **ogni errore applicativo** della piattaforma: procedure API (tRPC), login/sincronizzazione utente, simulazioni, invii email, cron. Per ogni evento sono registrati livello (Errore/Warning/Info), sorgente, percorso, messaggio, **stack trace** e metadati, oltre a utente, IP e request-id quando disponibili. La pagina offre **filtri** per livello e sorgente, ricerca su messaggio/percorso/utente, contatori sintetici, dettaglio espandibile con stack, e un'azione per **eliminare i log più vecchi di 30 giorni**. Sostituisce i log runtime di Vercel (retention breve senza piano Pro) con uno storico affidabile e consultabile.
- **Cattura automatica degli errori.** Un middleware centrale intercetta e registra automaticamente ogni errore imprevisto di **tutte** le procedure API, senza doverlo gestire endpoint per endpoint; gli errori "attesi" (permessi, validazione, non autorizzato) non vengono loggati per non generare rumore. Aggiunto inoltre il logging esplicito nei punti critici fuori da tRPC (login, salvataggio progresso simulazione, invio email di verifica/reset, cron, form pubblici).

### Removed
- **Rimossa la sezione *Log Email*.** La pagina `/log-email` e la relativa tabella sono state eliminate: i **fallimenti di invio email** confluiscono ora nel nuovo **Log Errori** (sorgente `EMAIL`), mentre gli invii riusciti non vengono più tracciati.

### Infrastructure
- Migrazione DB: rimossa la tabella `email_logs` (+ enum `EmailLogStatus`) e introdotta `application_logs` (+ enum `LogLevel`) con indici su livello, sorgente, utente e data.

## [1.12.0] - 2026-07-07

### Added
- **Import domande da PDF.** Nella pagina *Importa Domande* (`/domande/importa`) c'è ora uno switch **File CSV / File PDF**. Caricando un PDF di un compito (struttura tipo IMAT: domanda numerata + risposte A–E) il sistema **estrae automaticamente** le domande e le mostra in un elenco editabile. Per ogni domanda si scelgono **materia, argomento, tag e difficoltà**; la **risposta corretta è preselezionata sulla A** ma è modificabile. Si può **salvare tutto come bozza** oppure **pubblicare** (la pubblicazione richiede materia e argomento su ogni domanda; quelle incomplete vengono salvate come bozza).
- **Rilevamento duplicati in fase di import.** Prima del salvataggio ogni domanda estratta viene confrontata (corrispondenza esatta del testo, normalizzato) con quelle già presenti in database: i duplicati sono marcati **"Già presente"** ed esclusi dall'importazione.
- **Segnalazione domande da rivedere + ritaglio immagine.** Le domande che contengono tabelle, grafici o figure (che l'estrazione testo rende male) vengono marcate **"Da rivedere"**; per queste il sistema **ritaglia la relativa porzione di pagina dal PDF** e la allega come immagine alla domanda, così tabelle/figure non vanno perse. Il ritaglio è **ingrandibile con un clic**. Testo e risposte restano comunque modificabili a mano.
- **Campi domanda completi in fase di import.** Ogni domanda estratta espone gli stessi campi della creazione manuale: **tipo** (singola/multipla/aperta), **lingua**, **difficoltà**, risposte con **aggiungi/rimuovi** e selezione della/e corretta/e, **Mescola l'ordine delle risposte** (attivo di default), e in *Opzioni avanzate* immagine (URL), descrizione, anno, fonte e spiegazioni (corretta/errata/generale). Anno e fonte sono precompilati dal nome del file.
- **Vista Tabella con assegnazione multipla.** Oltre alla vista a schede, una **vista tabella** con selezione multipla (checkbox + "seleziona tutte") e una barra **"Assegna a N selezionate"** per impostare in blocco materia, argomento, tag, difficoltà, tipo, lingua e mescola. **Filtri rapidi** un clic: Tutte / Da rivedere / Duplicati.

## [1.11.0] - 2026-07-07

### Added
- **Assegnazione dei gruppi direttamente dalla pagina Utenti.** Nella colonna **"Gruppi"** ogni studente/collaboratore ha ora un menu a tendina inline: cliccando sui badge si apre un elenco con checkbox (e ricerca oltre i 6 gruppi) per **aggiungere o rimuovere** i gruppi al volo, con salvataggio immediato e notifica all'utente per ogni nuovo gruppo. I gruppi proposti sono filtrati per compatibilità di tipo (uno studente non può entrare in un gruppo solo-collaboratori e viceversa). Questo rende più rapido gestire i ragazzi in prova/senza contratto senza passare dalla pagina *Gruppi* (flusso che resta comunque disponibile).
- **Assegnazione massiva a un gruppo.** Nuove checkbox di selezione riga (desktop e mobile, con "seleziona tutti") sulla pagina Utenti: selezionando più utenti compare una barra d'azione per assegnarli **tutti insieme allo stesso gruppo** in un colpo solo. Studenti e collaboratori non compatibili con il tipo di gruppo scelto vengono automaticamente esclusi, e il riepilogo indica quanti sono stati aggiunti e quanti già presenti/non compatibili.

### Added
- **Inserimento manuale di uno studente in una simulazione in corso.** Nella Virtual Room lo staff può aggiungere uno studente non assegnato tramite il nuovo pulsante **"Aggiungi studente"**, anche a sessione già avviata (ingresso in ritardo). Se lo studente non ha un'assegnazione valida ne viene creata una diretta al volo (con notifica), così la simulazione compare subito nella sua lista e può entrare nella stanza attiva; conteggi connessi/totali e monitoraggio live includono anche gli studenti inseriti manualmente. Per le simulazioni senza Virtual Room resta il flusso di assegnazione esistente (con finestra di accesso immediata).
- **Reset del tentativo di uno studente (Virtual Room e non).** Lo staff può resettare un tentativo bloccato o già inviato mantenendo le risposte salvate: il tentativo torna "in corso" e lo studente riprende da dove era rimasto. Al momento del reset si sceglie se **mantenere il tempo trascorso** (con almeno 60 secondi residui garantiti) o **azzerare il timer**. Disponibile dalla card del partecipante nella Virtual Room (inclusi studenti espulsi, che vengono riammessi) e dalla riga studente nelle statistiche dell'assegnazione. Se la finestra di accesso di un'assegnazione diretta è chiusa viene riaperta automaticamente per 24 ore (per le assegnazioni di gruppo lo staff riceve un avviso). Un tentativo resettato è protetto per 24 ore dall'invalidazione automatica delle nuove sessioni della stanza, il collegamento partecipante↔tentativo viene riallineato ripartendo in una nuova sessione, e le schede rimaste aperte prima del reset non possono più sovrascrivere o re-inviare il tentativo ripristinato.
- **Nuova capability `simulations.manageAttempts` (default OFF).** Controlla entrambe le azioni (inserimento manuale e reset dei tentativi) per i collaboratori tramite la matrice permessi in `/permessi`; gli admin le hanno sempre.

### Infrastructure
- Nuova migrazione Prisma `add_simulation_result_reset_fields`: campi `resetAt`/`resetById` su `simulation_results` (tracciano il reset e proteggono il tentativo dall'invalidazione automatica).

## [1.9.0] - 2026-07-07

### Added
- **Nuova capability `students.viewAll` (default OFF).** Di base un collaboratore con `students.view` vede solo gli studenti dei **propri gruppi** (referente o membro); con questo flag la lista si estende a **tutti** gli studenti della piattaforma. Applicato a `getListForCollaborator` (la lista della pagina *Studenti* del collaboratore). Admin invariato (vede sempre tutti).

### Fixed
- **I dati sensibili dello studente ora compaiono per i collaboratori con `students.viewSensitive`, in entrambi i modali.** Due modali diversi erano coinvolti e nessuno mostrava i dati:
  - *"Dettagli studente"* (pagina *Studenti* del collaboratore): usa `getStudentDetailForCollaborator`, che restituiva solo `dateOfBirth`+`parentGuardian` e li mostrava solo se presenti (quindi su uno studente maggiorenne senza genitore non appariva nulla). Ora il backend restituisce anche codice fiscale, comune di nascita, telefono e indirizzo dello studente (col flag), e il modale ha una sezione **"Dati Anagrafici Sensibili"** che compare sempre con la capability (placeholder "Non specificato" per i campi vuoti).
  - *"Profilo Utente"* (`UserInfoModal`): `students.getPublicInfo` non restituiva alcun dato sensibile a nessun ruolo. Ora include codice fiscale, data di nascita e indirizzo/città/provincia/CAP quando il chiamante ha `students.viewSensitive` (mascherati a `null` altrimenti).
  In tutti i casi i dati restano nascosti senza la capability. Admin invariato.

## [1.8.4] - 2026-07-07

### Fixed
- **Gli studenti non ricevono più il toast "Permesso negato" aprendo il Calendario.** La vista studente carica le card statistiche (Totali/Questo mese/In arrivo/Assenze) da `calendar.getStats`, che durante l'audit permessi era diventata `staffProcedure`: ogni studente generava un FORBIDDEN a ogni apertura del calendario (e le card restavano vuote). Ora `getStats` è `protectedProcedure` gated da `calendar.view` (default ON per tutti i ruoli) con **scoping per studente** (conta solo gli eventi pubblici, quelli a cui è invitato e quelli dei suoi gruppi); il conteggio "Assenze pending" (concetto di staff) è forzato a 0 per gli studenti. Collaboratori e admin invariati.

## [1.8.3] - 2026-07-07

### Fixed
- **Login che "ricaricava la pagina" senza entrare (soprattutto su Safari).** Più studenti non riuscivano ad accedere: dopo l'invio delle credenziali venivano rimbalzati al login senza alcun errore. Causa: la pagina di login chiamava `/api/auth/me` **due volte** quasi in parallelo (l'auto-resync di `onAuthStateChanged` scattava insieme al login manuale) e ogni chiamata **rigenerava** il session token single-device dello studente. Su Safari le due chiamate concorrenti lasciavano il cookie `session-device-token` disallineato rispetto all'`activeSessionToken` nel DB, così la prima query tRPC della dashboard falliva (`getMyContract` → 403, `getDetailedStats` → 401 `SESSIONE_TERMINATA`) e l'utente veniva disconnesso e riportato al login. Ora `/api/auth/me` **rigenera il token solo se il device non ne ha già uno valido** (idempotente: se il cookie combacia lo riusa), e l'auto-resync viene sospeso mentre un login manuale è in corso. L'enforcement single-device (un vero login da un altro dispositivo invalida gli altri) resta invariato.

## [1.8.2] - 2026-07-07

### Fixed
- **Account disattivati manualmente ora finiscono in "Disattivati", non più in "Attesa contratto".** Nella gestione utenti, un account senza contratto (es. un collaboratore/segreteria attivato "comunque" e poi disattivato) veniva erroneamente classificato come *Attesa contratto*, perché lo stato "disattivato" era dedotto solo dalla presenza di un contratto `CANCELLED`/`EXPIRED`. Ora la disattivazione manuale è tracciata esplicitamente (`User.deactivatedAt`, valorizzato da `users.toggleActive`) e ha **precedenza assoluta**: l'account compare solo in *Disattivati* — filtri, conteggi statistiche e badge di stato — indipendentemente dallo stato del contratto e dal tipo di collaboratore (tutor o segreteria). *Nota: gli account già disattivati prima di questo fix vanno ri-attivati e ri-disattivati una volta per valorizzare il flag.*
- **Anti-cheat: eliminati i falsi allarmi da telefono/tablet nella Virtual Room.** Su dispositivi touch i controlli pensati per desktop scattavano per gesti normali, riempiendo la Virtual Room di eventi sospetti non veritieri (`useAntiCheat`):
  - *DevTools*: l'euristica basata sulle dimensioni della finestra scattava all'apertura della tastiera virtuale o con il pinch-zoom, e ri-loggava **ogni secondo**. Ora è disattivata sui dispositivi touch e su desktop logga solo alla transizione chiuso→aperto.
  - *Finestra in background*: su iOS il `blur` scatta per azioni innocue (tastiera, barra indirizzi, notifiche); su touch ora conta solo il vero cambio app/scheda (`visibilitychange`). Inoltre un singolo cambio scheda non viene più conteggiato due volte (`blur` + `visibilitychange`).
  - *Uscita dal fullscreen*: su WebKit veniva registrata un'uscita fantasma al momento dell'**ingresso** in fullscreen (mancava il controllo di `webkitFullscreenElement`); ora si logga solo la vera transizione fullscreen→finestra. Su iPhone (dove l'API non esiste) e sui touch il fullscreen non viene più forzato né loggato, e l'overlay "Schermo intero richiesto" non blocca più l'esame.
  - *Click destro*: il long-press su touch genera `contextmenu`; il menu resta bloccato ma non viene più conteggiato come click destro.
  - *Anti-spam generale*: lo stesso tipo di evento non viene più registrato più di una volta ogni 5 secondi, così il contatore violazioni riflette azioni distinte.
- **Anti-cheat: config della simulazione ora applicata davvero.** Il componente di esecuzione passava al hook chiavi inesistenti: il fullscreen veniva forzato anche quando la simulazione non lo richiedeva, e l'auto-consegna al raggiungimento delle 10 violazioni (mostrata nell'overlay "Violazioni: X/10") non era mai attiva. Ora `forceFullscreen` rispetta l'impostazione della simulazione e l'auto-consegna funziona (e scatta una sola volta).
- **Formule LaTeX e HTML ora renderizzate nelle statistiche per studente.** Nel pannello "Dettagli per Studente" (`AssignmentStatistics`) il testo della domanda, la risposta dello studente e la risposta corretta venivano mostrati come testo grezzo (es. `\(y = \cos x\)`, `10\(\small^{18}\)`, `O\(_{2}\)`). Ora usano `RichTextRenderer`, coerentemente con la sezione "Domande più sbagliate" e con l'esecuzione della simulazione.

## [1.8.0] - 2026-07-07

Statistiche a più livelli per i collaboratori: dati di studenti/simulazioni ambito ai propri gruppi, con flag per estendere a tutti, e area riservata (economica + collaboratori) separata.

### Added
- **Nuova capability `stats.viewAllStudents` (default OFF).** Di base un collaboratore con l'accesso alle statistiche vede solo gli studenti dei **propri gruppi** (referente o membro); con questo flag le statistiche si estendono a **tutti** gli studenti della piattaforma. Applicato sia a `getAdminPlatformStats` (conteggi studenti, andamento iscrizioni, risultati/medie/performance per materia, tabella studenti, risultati recenti, attività mensile) sia a `getAdminSimulationResults` (tab "Simulazioni svolte"). Admin invariato (vede sempre tutto).
- **Nuova capability `stats.viewFinancial` (default OFF).** Racchiude le statistiche **riservate**: ricavi/andamento economico e attività dei collaboratori. Senza il flag il backend non calcola né restituisce questi dati (non solo nascosti lato UI) e la pagina Statistiche nasconde la tab *Collaboratori* e le card *Ricavi Totali* / *Ricavi Mensili*.

### Changed
- **La pagina Statistiche per i collaboratori ora è ambito e filtrata per capability.** Prima Tutor/Segreteria con `stats.viewPlatform` vedevano l'intera dashboard di piattaforma (inclusi ricavi e attività di tutti i collaboratori, su tutti gli studenti). Ora vedono di default solo i **propri gruppi** e **niente dati economici/collaboratori**, salvo attivazione dei due nuovi flag. `stats.viewPlatform` resta default ON (studenti+simulazioni dei propri gruppi). Admin invariato.

## [1.7.0] - 2026-07-06

Passata sistematica sull'intero catalogo capability (audit multi-agente di backend, UI e vincoli di proprietà per tutte le ~34 capability). Chiusi tutti gli 11 gap confermati; 4 aree già a posto (Tag, Studenti, Statistiche/Messaggi, Area studente).

### Security
- **Chiuso il bypass di `questions.publish`.** La capability era applicata solo in `publishQuestion`, ma lo stato `PUBLISHED` era raggiungibile senza il flag tramite `createQuestion`/`updateQuestion` (gated solo da `questions.manage`) e `bulkUpdateStatus` (gated da `questions.bulkOps`). Ora i tre percorsi rifiutano con FORBIDDEN se lo stato diventa `PUBLISHED` senza `questions.publish`. Lato UI il pulsante *Pubblica* di `QuestionForm` e i *Pubblica/Ritira* della pagina dettaglio compaiono solo con la capability.

### Added
- **5 nuove capability opt-in "gestione di tutti" (tutte default OFF, zero-break).** Chiudono i vincoli di proprietà nascosti emersi dall'audit, con lo stesso pattern già usato per assegnazioni/domande/tag:
  - **`simulations.manageAll`** — modificare/pubblicare/archiviare anche le simulazioni altrui. Inoltre `update`/`updateQuestions`/`duplicate` sono passate da admin-only a staff (`simulations.manage`), così un collaboratore può finalmente **modificare** le proprie simulazioni (prima la "modifica" del flag era irraggiungibile).
  - **`groups.manageAllMembers`** — aggiungere/rimuovere membri anche nei gruppi di cui non si è referente. Con il flag la pagina "I Miei Gruppi" mostra **tutti** i gruppi (non solo i propri), così ci sono gruppi altrui su cui agire.
  - **`events.manageAll`** — modificare/annullare/gestire inviti anche degli eventi altrui. Con il flag il calendario (e i contatori) mostrano **tutti** gli eventi, non solo i propri/pubblici.
  - **`attendance.manageAll`** — registrare le presenze anche degli eventi altrui: con il flag la pagina Presenze e il calendario mostrano **tutti** gli eventi.
  - **`questions.reviewAllFeedback`** — gestire le segnalazioni di qualsiasi materia (prima concederle a una Segreteria non aveva effetto: la lista restava vuota e l'update era negato).
- **Operazioni massive sulle domande per i collaboratori.** La UI di selezione multipla + toolbar bulk (stato, materia, lingua, tag, eliminazione) esisteva solo nella vista admin: ora è replicata nella vista collaboratore, interamente gated da `questions.bulkOps` (senza il flag l'interfaccia è identica a prima).

### Fixed
- **La pagina statistiche simulazione ora rispetta `simulations.viewStats`.** L'accesso usava il ruolo (`isStaff`) invece della capability: con il flag revocato la pagina si apriva comunque (solo le query interne fallivano) e il link *Statistiche* restava visibile. Ora sia la pagina sia il link seguono `can('simulations.viewStats')`.
- **La UI di `questions.manage` rispetta il flag.** I pulsanti *Nuova Domanda*/crea/modifica erano mostrati anche a flag revocato (fallendo solo lato server). Ora sono gated da `can('questions.manage')`.
- **La UI di `materials.manage` rispetta il flag.** I controlli crea/modifica/elimina di materie e materiali erano sempre visibili; ora sono gated da `can('materials.manage')`.
- **`materials.manageAccess` non è più un flag inerte.** L'assegnazione destinatari passa da `materials.update` (gated da `materials.manage`), quindi il flag non governava nulla. Ora `update` richiede `materials.manageAccess` quando cambia visibilità/destinatari, e il pulsante *Gestisci destinatari* è gated dalla capability.
- **La UI di `events.manage` rispetta il flag.** Il pulsante *Nuovo Evento* (e l'aggiunta evento dal calendario) era sempre visibile; ora è gated da `can('events.manage')`, e modifica/eliminazione seguono `proprio || events.manageAll`.
- **I flag "…di tutti" ora ampliano anche la LISTA, non solo i permessi d'azione.** Le query self-scoped (`getMyGroups`, `calendar.getEvents`/`getStats`) mostravano sempre solo i propri elementi, quindi concedere `groups.manageAllMembers`/`events.manageAll`/`attendance.manageAll` non faceva comparire nulla su cui agire. Ora, con la capability, la lista include tutti i gruppi / tutti gli eventi. Stessa correzione applicata al percorso di creazione materiali: `create`/`createBatch` ora richiedono `materials.manageAccess` quando il nuovo materiale è già condiviso con un pubblico (prima aggiravano il gate presente solo su `update`).
- **I dati sensibili dello studente compaiono anche quando i campi sono vuoti.** Con `students.viewSensitive` il modale mostrava la sezione "Dati Anagrafici Sensibili" solo se i campi erano valorizzati, così su uno studente senza data di nascita/genitore sembrava che il flag non funzionasse. Il backend ora espone `canViewSensitive` e la UI mostra sempre la sezione (con "Non specificata" / "Nessun dato del genitore/tutore registrato") quando hai la capability.

### Infrastructure
- Audit eseguito con un workflow multi-agente (9 agenti di analisi per area + verifica adversariale sui gap): report completo backend/UI/proprietà per ogni capability del catalogo.

## [1.6.0] - 2026-07-06

### Fixed
- **I collaboratori possono ora vedere le statistiche delle simulazioni pubblicate, non solo delle proprie.** La lista simulazioni mostra ai collaboratori le proprie + tutte le pubblicate, ma le 4 procedure di statistiche (`getStatistics`, `getQuestionAnalysis`, `getTemplateStatistics` e le statistiche per assegnazione) rifiutavano con FORBIDDEN qualsiasi simulazione non creata da loro → "Errore nel caricamento delle statistiche" su una simulazione pubblicata da un altro. Ora la visibilità delle statistiche segue quella della simulazione: **proprie oppure pubblicate** (serve comunque `simulations.viewStats`). Admin invariato.
- **I collaboratori con `students.viewSensitive` vedono finalmente i dati sensibili degli studenti.** Il backend (`getStudentDetailForCollaborator`) restituiva correttamente data di nascita e dati del genitore/tutore solo con la capability, ma il modale di dettaglio studente (`StudentDetailModal`) non renderizzava affatto quei campi → con il flag attivo si vedevano comunque solo i dati basici. Aggiunta la sezione "Dati Anagrafici Sensibili" (data di nascita + genitore/tutore: parentela, nome, codice fiscale, telefono, email, indirizzo), che compare solo quando i dati arrivano dal server, quindi resta nascosta senza la capability.
- **La pagina *Segnalazioni domande* (`/domande/segnalazioni`) ora è protetta dalla capability `questions.reviewFeedback`.** Prima era gated solo da `isStaff`: un collaboratore senza la capability (es. Segreteria) poteva aprire la pagina e riceveva FORBIDDEN dalle query, invece di essere reindirizzato. Ora la pagina reindirizza a `/domande` se manca `reviewFeedback` (allineata al gate backend di `getPendingFeedbacks`/`updateFeedback`). Admin e Tutor invariati.
- **Il pulsante *Importa* in `/domande` ora rispetta la capability `questions.import`.** Nella vista collaboratore il pulsante era mostrato incondizionatamente e la pagina `/domande/importa` era protetta solo da `isStaff`: un collaboratore senza `questions.import` (es. Segreteria) vedeva comunque il pulsante e poteva aprire la pagina (il submit falliva poi lato server, già gated). Ora il pulsante compare solo con la capability e la pagina reindirizza a `/domande` se manca. Admin invariato.
- **La pagina *Gestione Tag* non mostra più un toast "Permesso negato" all'apertura per i collaboratori.** La barra dei conteggi in testata era alimentata da `questionTags.getStats`, che era `adminProcedure`: un collaboratore (anche con `tags.manage`) generava un FORBIDDEN a ogni caricamento, pur potendo vedere e gestire i tag. `getStats` è ora `staffProcedure`, coerente con le procedure di lettura sorelle della stessa pagina (`getCategories`, `getTags`) che sono già staff-only senza gate capability. Restituisce solo conteggi aggregati e top-tag. Admin invariato.

### Added
- **Nuova capability "Gestire le assegnazioni di tutti" (`simulations.manageAllAssignments`).** Di default un collaboratore può chiudere/riaprire/modificare/eliminare solo le assegnazioni che ha creato lui (comportamento invariato: la nuova capability nasce OFF per tutti i ruoli). Quando l'admin la concede da *Permessi*, quel collaboratore può gestire anche le assegnazioni create da altri (come l'admin). Applicata sia lato UI (menu azioni della tab *Assegnazioni*) sia lato server sui 4 endpoint di assegnazione (`closeAssignment`, `reopenAssignment`, `updateAssignments`, `removeAssignment`), che prima rifiutavano con FORBIDDEN le assegnazioni non proprie.
- **Nuova capability "Gestire categorie e tag di tutti" (`tags.manageAll`).** Di default un collaboratore può modificare/eliminare solo le categorie e i tag che ha creato lui (comportamento invariato: la nuova capability nasce OFF per tutti i ruoli), quindi in *Gestione Tag* quelli altrui (es. importati da Firestore) restavano di sola lettura anche con `tags.manage` attivo. Quando l'admin la concede da *Permessi*, il collaboratore può gestire anche categorie e tag creati da altri: rilassati i 4 guard server (`updateCategory`, `deleteCategory`, `updateTag`, `deleteTag`) e il gate UI su modifica/eliminazione; il banner "Permessi limitati" scompare quando la capability è concessa. Admin invariato.
- **Nuova capability "Gestire le domande di tutti" (`questions.manageAll`).** Di default un collaboratore può modificare/archiviare/eliminare solo le domande che ha creato lui (comportamento invariato: la nuova capability nasce OFF per tutti i ruoli), quindi sulle domande altrui il menu azioni di `/domande` mostrava solo *Visualizza* e *Duplica per me* anche con i flag *Creare e modificare* / *Pubblicare* attivi. Quando l'admin la concede da *Permessi*, il collaboratore può gestire anche le domande create da altri: rilassati sia i 4 endpoint server (`updateQuestion`, `deleteQuestion`, `archiveQuestion` e `getQuestion` per aprire l'editor sulle bozze/archiviate altrui) sia il gate UI del menu azioni. Inoltre i pulsanti *Pubblica*/*Ritira* ora compaiono solo con `questions.publish` (prima erano mostrati ai proprietari anche senza la capability, generando un errore al click). Admin invariato.
- **I collaboratori con la capability "Creare ed eliminare gruppi" (`groups.manage`) possono ora creare gruppi.** Finora il toggle era configurabile dalla matrice *Permessi* ma la vista collaboratore ("I Miei Gruppi") era di sola lettura, quindi abilitarlo non aveva alcun effetto. Ora, quando la capability è concessa, compare il pulsante *Nuovo Gruppo* con una modale semplificata (nome, descrizione, tipo, colore). I riferimenti/membri si aggiungono dopo con la gestione membri già esistente: la modale admin usa query admin-only per popolare i selettori, quindi qui sono volutamente omessi. Lato server, `groups.create` (già `staffProcedure` + `groups.manage`) ora **auto-associa il collaboratore creatore come referente**, così il gruppo appena creato compare subito in "I Miei Gruppi" (la creazione da parte dell'admin non cambia).

## [1.5.4] - 2026-07-06

### Fixed
- **Il badge "Risposte Aperte" in `/simulazioni` non genera più FORBIDDEN per la Segreteria.** La pagina lanciava `getResultsWithPendingReviews` (gated da `simulations.correctOpenAnswers`) in modo incondizionato per popolare il contatore, così un collaboratore *Segreteria* — che per default non ha quella capability — riceveva un errore *Permesso negato* a ogni caricamento. Ora sia la query (nel hook condiviso `useSimulationsList`, usato dalla vista collaboratore) sia il bottone *Risposte Aperte* sono gated da `usePermissions().can('simulations.correctOpenAnswers')`; stesso gate applicato anche alla vista admin. È la stessa correzione già fatta per le card di `/domande` nella 1.5.3, che qui mancava. ADMIN e Tutor non cambiano.

## [1.5.3] - 2026-07-06

Audit completo del sistema permessi (rotte, backend, frontend, sicurezza) con correzione di tutti i problemi emersi.

### Security
- **Gli account disattivati non hanno più alcuna capability lato server.** Dopo la disattivazione da parte dell'admin il token Firebase resta valido e il middleware edge si basa su un cookie scrivibile dal client: un collaboratore/studente disattivato poteva continuare a usare tutte le API. Ora un account non-admin con `isActive=false` risolve un set di capability **vuoto**, quindi ogni procedura protetta da capability risponde FORBIDDEN. Le letture self-service non vincolate (profilo, firma contratto, `auth.me`) restano funzionanti, così i flussi di onboarding/attesa contratto non cambiano.
- **Corretto il matching dei prefissi di rotta nel middleware.** `hasAccess` restituiva il **primo** prefisso corrispondente in ordine di inserimento: `/simulazioni` (aperta a tutti) oscurava la più specifica `/simulazioni/risposte-aperte/[id]` (solo staff), consentendo a uno studente di raggiungere la pagina di correzione. Ora vince sempre il prefisso più lungo/specifico (con test di regressione).
- **Rimosso `capabilityProcedure` (mai usato).** Un endpoint gated dalla sola capability senza wrapper di ruolo avrebbe permesso a un toggle della matrice di aprire un endpoint staff agli studenti; documentata la regola "sempre role procedure + `assertCapability`".
- **Audit trail sulle modifiche della matrice permessi.** `setCapabilities`/`resetToDefaults` ora registrano nei log admin, numero e dettaglio degli override modificati; un batch con capability sconosciute viene rifiutato con errore esplicito invece di essere filtrato in silenzio.

### Fixed
- **Chiuse tutte le procedure staff senza gate capability.** Aggiunti i gate mancanti a: template di simulazione (`simulations.view` letture, `simulations.manage` CRUD/duplica), Virtual Room (controllo sessione d'esame → `simulations.assign`), helper delle assegnazioni e lista assegnazioni (`simulations.assign`/`simulations.view`), letture/export domande (`questions.view` su filtri, export CSV, statistiche, tag disponibili; `questions.manage` su suggerimento keyword), assegnazione tag alle domande (`questions.manage`), letture e statistiche gruppi (`groups.view`), letture/statistiche materiali staff (`materials.view`) e mutazioni degli argomenti (`materials.manage`, in aggiunta al check per materia esistente). Con i default il comportamento resta invariato; da ora le revoche dalla pagina *Permessi* hanno effetto reale su tutte queste operazioni.
- **`messages.use` e `calendar.view` ora sono applicate davvero.** L'intero router messaggi è gated da `messages.use` (il contatore non letti degrada a 0 invece di andare in errore, essendo pollato dall'header) e `getEvents`/`getEvent` da `calendar.view`; prima le due capability esistevano nel catalogo ma non erano applicate da nessuna parte. Le voci *Messaggi* (icona header, menu mobile staff e studente) e i quick link della dashboard studente si nascondono di conseguenza.
- **`/statistiche` di nuovo accessibile ai collaboratori.** L'unificazione delle mappe di rotta della 1.5.0 l'aveva ristretta ad ADMIN+STUDENT, ma la pagina e il backend (gated da `stats.viewPlatform`) supportano i collaboratori: ripristinato l'accesso e aggiunta la voce *Statistiche* alla nav dei collaboratori.
- **Le card "Segnalazioni domande" e "Risposte aperte" in `/domande`** ora compaiono solo con le rispettive capability (`questions.reviewFeedback`, `simulations.correctOpenAnswers`) e le relative query non partono più senza permesso: prima un segretario generava un errore FORBIDDEN a ogni caricamento della pagina e un tutor con la capability revocata vedeva comunque la card; il vecchio check `kind === 'TUTOR'` è sostituito dalla matrice (ora un segretario abilitato vede il conteggio corretto).
- **`student.viewOwnStats` e `student.viewGroup` ora hanno enforcement backend** su `getMyStats`/`getDetailedStats`/`getMyGroup` (solo per il ruolo STUDENT, i chiamanti staff non sono toccati); prima erano solo nav-hiding.

### Added
- **Gating capability sulle azioni studente.** Il bottone hero *Autoesercitazione* e i quick link della dashboard, la card *Quiz Veloce* e il bottone di creazione in `/simulazioni`, e il bottone *Segnala domanda* durante lo svolgimento si nascondono quando la capability corrispondente è revocata (prima l'utente compilava il form e falliva solo al submit).
- **Feedback esplicito sugli errori di permesso.** Quando una query tRPC viene rifiutata con FORBIDDEN (es. una pagina staff caricata da un collaboratore a cui la capability è stata revocata) ora compare un toast "Permesso negato" invece di un'area vuota silenziosa che sembrava "nessun dato". Gestore globale `PermissionDeniedHandler` (throttle per non moltiplicare i toast quando una pagina lancia più query gated insieme); le mutazioni restano gestite da `handleMutationError` per non duplicare l'avviso.

### Chore
- Ridotti i warning ESLint (`sonarjs`): rimossi i template literal annidati in `AdminQuestionsContent`, `CollaboratorQuestionsContent`, login, `TestCard`, `useQuestionForm` e nello script di migrazione immagini, e usato l'alias di tipo esistente in `FillSectionModal`. Restano solo warning legacy di complessità cognitiva non correlati.

## [1.5.1] - 2026-07-06

### Fixed
- **Virtual Room: la perdita di connessione non chiude più la simulazione.** Uno studente espulso o disconnesso durante lo svolgimento riceveva dal server uno `status: 'COMPLETED'` sintetico (usato solo per rimuoverlo dalla stanza): il client lo interpretava come "sessione terminata dall'admin" e faceva partire l'auto-consegna, finalizzando un tentativo mai concluso e lasciando lo studente bloccato con "Hai già completato questa simulazione". Ora l'espulsione viene gestita per prima e non innesca più l'auto-consegna. Aggiunto lo script `scripts/reset-student-simulation.ts` (dry-run di default) per sbloccare gli studenti già colpiti dal problema.

## [1.5.0] - 2026-07-06

### Added
- **Enforcement capability sull'area studente.** Le procedure lato studente sono ora governate dalle rispettive capability (`student.takeSimulations` per svolgimento/salvataggio/consegna/autocorrezione simulazioni; `student.selfPractice` per quiz rapidi ed esercitazioni personali; `student.favorites` per i preferiti; `student.submitQuestionFeedback` per le segnalazioni; `student.viewMaterials` per i materiali assegnati; `student.viewOwnStats` sui propri risultati). Con i default il comportamento è invariato: l'admin può ora revocarle dalla pagina *Permessi*. Le letture di soli dati propri condivise anche con lo staff (statistiche personali, proprio gruppo) restano non vincolate lato backend e sono gestite lato frontend.
- **Gating della navigazione in base alle capability.** Le voci di menu (desktop e mobile, sezioni *Gestione*/*Didattica*/*Registro* e nav studente) si nascondono quando l'utente non possiede la capability corrispondente secondo la matrice configurata dall'admin; le sezioni che restano senza voci scompaiono del tutto. Nuovo hook `usePermissions` (`can`/`canAny`/`canAll`, con **ADMIN** sempre abilitato) come specchio frontend di `assertCapability`. Il backend resta la fonte di verità: nascondere un pulsante è solo UX.

### Fixed
- **Unificate le mappe dei permessi di rotta.** `proxy.ts` (middleware edge) e `lib/permissions.ts` (client) avevano due mappe divergenti: ora esiste un'unica sorgente (`PAGE_PERMISSIONS` in `lib/permissions.ts`, importata dal middleware). Corretti nel contempo due disallineamenti reali: la rotta studente era mappata come `/il-mio-gruppo` invece di `/gruppo`, e `/statistiche` ora è coerentemente accessibile ad **ADMIN** e **STUDENT**. Di conseguenza gli studenti non possono più raggiungere `/simulazioni/nuova` e `/simulazioni/risposte-aperte` (pagine solo-staff), prima accessibili per una lacuna nella mappa del middleware.

### Changed
- **Rimossi i flag permessi legacy per-collaboratore dalla UI.** Le caselle *Gestione Domande / Materiali / Visualizza Statistiche / Studenti* nella pagina *Collaboratori* e i badge corrispondenti nel *Profilo* sono stati rimossi: erano flag scollegati dall'enforcement (ormai gestito dal sistema di capability). Resta il selettore **Tipo collaboratore** (Tutor/Segreteria), che è reale, con una nota che rimanda alla pagina *Permessi* per le abilitazioni dettagliate. L'input tRPC `collaborators.updatePermissions` non accetta più questi flag.

### Infrastructure
- I campi `canManageQuestions/canManageMaterials/canViewStats/canViewStudents` del modello `Collaborator` sono ora marcati **deprecati** e non più letti/scritti da alcun codice. Non vengono rimossi in questa release per rispettare l'approccio *expand→contract*: il drop delle colonne sarà una migration successiva backward-compatible (da applicare dopo il deploy di questo codice).

## [1.4.0] - 2026-07-06

### Added
- **Pagina Permessi (admin) — matrice delle abilitazioni.** Nuova pagina admin `/permessi` (voce menu in *Gestione*) con una matrice a caselle che permette di configurare, per ogni ruolo/tipo (**Studente**, **Collaboratore · Tutor**, **Collaboratore · Segreteria**), quali azioni sono consentite. I permessi sono raggruppati per area (Simulazioni, Domande, Studenti, Materiali, Gruppi, Calendario, Statistiche, Area studente…). L'**Admin** ha sempre tutti i permessi (colonna in sola lettura). Un indicatore segnala i valori diversi dal predefinito; barra di salvataggio con conteggio delle modifiche in sospeso e pulsante **Ripristina default** (con conferma). Nuovo router tRPC `permissions` (`getMatrix`, `setCapabilities`, `resetToDefaults`, admin only) che scrive gli override nella tabella `RolePermission` e invalida la cache dei permessi. Da questo momento le abilitazioni configurate qui hanno effetto reale su tutto il backend (l'enforcement introdotto in 1.3.3).

## [1.3.3] - 2026-07-06

### Infrastructure
- **Fondamenta del sistema di permessi granulari (capabilities).** Senza alcun cambio di comportamento (i default rispecchiano lo stato attuale): introdotto un catalogo centralizzato di permessi atomici (`lib/permissions/capabilities.ts`) con una matrice di default per soggetto (`STUDENT`, `COLLABORATOR_TUTOR`, `COLLABORATOR_SECRETARY`) che **rispecchia esattamente** ciò che ogni ruolo/tipo poteva già fare. Nuovo modello Prisma `RolePermission` (+ enum `PermissionSubject`) con migration `add_role_permissions`, usato come **solo store di override**: a tabella vuota il comportamento è identico a prima. Il resolver (`lib/permissions/resolve.ts`) risolve le capability dell'utente una volta per richiesta (cache TTL, con *last-known-good* sui blip del DB così le revoche admin non vengono mai ri-concesse), le espone in `ctx.capabilities` e in `auth.me`. Aggiunti gli helper backend `assertCapability`/`hasCapability`/`capabilityProcedure` (con **ADMIN super-user fisso**).
- **Enforcement capability sull'area Simulazioni.** Il blocco hardcoded "segreteria non corregge le risposte aperte" è ora la capability `simulations.correctOpenAnswers`; le procedure staff di simulazioni (visualizzazione, creazione/modifica, assegnazioni, statistiche, risultati cartacei) sono governate dalle rispettive capability (`simulations.view/manage/assign/viewStats/paperResults`) mantenendo `staffProcedure` come guardia strutturale. Con i default il comportamento è invariato; l'admin potrà riconfigurarlo dalla futura pagina permessi. La selezione del correttore ora rispetta la matrice invece di un check `kind === 'TUTOR'` fisso.
- **Enforcement capability esteso a tutte le aree staff.** Aggiunti gate a capability (~65 procedure) su Domande (`questions.view/manage/publish/import/bulkOps/reviewFeedback`), Tag (`tags.manage`), Studenti (`students.view/viewSensitive`), Materiali (`materials.view/manage/manageAccess`), Gruppi (`groups.view/manageMembers/manage`), Calendario/Presenze (`events.manage/attendance.manage/absences.requestOwn`) e Statistiche di piattaforma (`stats.viewPlatform`). I check inline `role !== 'ADMIN'` (pubblicazione domande) sono stati sostituiti dalle capability equivalenti. Alcune operazioni prima solo-admin (bulk/import domande, creazione/eliminazione gruppi) sono ora `staffProcedure` con capability a default `false`: restano **solo-admin come prima**, ma diventeranno concedibili ai collaboratori dalla pagina permessi. Nessun cambiamento di comportamento con i default. Restano da gestire in una fase successiva i permessi lato area studente e il gating frontend/rotte.

## [1.3.2] - 2026-07-06

### Changed
- **Aggiornati date e documenti dei test di ammissione** (homepage e pagina `/test`) al ciclo 2026:
  - **Semestre Aperto:** nuovi link ai Syllabus 2026 di Chimica e Propedeutica Biochimica, Fisica e Biologia.
  - **IMAT:** data del test aggiornata al **30 settembre 2026**.
  - **Professioni Sanitarie:** la voce unica "Test LM" è stata sostituita da **Test LM IT (5 ottobre 2026)** e **Test LM ENG (7 ottobre 2026)**; aggiornate anche Test IT (**16 settembre 2026**) e Test ENG (**17 settembre 2026**).
  - **Test ARCHED:** nuovi link al Decreto Ministeriale n. 706 del 04-06-2026 e ai relativi Syllabi (Allegato A).
  - **Scienze della Formazione Primaria (LM-85 bis):** data del test aggiornata all'**11 settembre 2026**; nuovi link al Decreto Ministeriale n. 931 del 03-07-2026 e ai relativi Syllabi.

## [1.3.1] - 2026-07-04

### Fixed
- **Filtro "No Firma" (Gestione Utenti) che mostrava anche utenti con contratto firmato.** Selezionando il filtro, il mapping dello stato lato client non gestiva il valore `no_signed_contract` e ricadeva su `ALL`, inviando al server la richiesta di *tutti* gli utenti. Ora il filtro invia correttamente `NO_SIGNED_CONTRACT` e mostra solo studenti e collaboratori **senza un contratto firmato** (inclusi quelli in "attesa contratto" e "attesa firma"), escludendo gli admin.

## [1.3.0] - 2026-07-03

### Added
- **Storico invii email (Log Email).** Nuova pagina admin `/log-email` che mostra ogni email inviata dalla piattaforma con destinatario, oggetto, categoria, esito (**Inviata**/**Fallita**), messaggio d'errore e data. Filtri per stato, categoria e ricerca su destinatario/oggetto, più contatori sintetici (totali/inviate/fallite). Serve a distinguere "email mai partita" da "email partita ma finita in spam" senza dipendere dai log di Vercel (retention breve senza piano Pro).

### Fixed
- **Email di gruppo che non arrivavano ad alcuni destinatari.** Negli invii massivi (inviti/modifiche/cancellazioni eventi, inviti simulazione) ogni email apriva una **nuova connessione SMTP** e partivano tutte in raffica: Aruba, superata la sua soglia, rifiutava le connessioni successive (`550 ... temporarily rejected`), quindi i primi destinatari ricevevano e i restanti no. Ora gli invii massivi **riusano una singola connessione** (transporter con `pool`, `maxConnections: 1`) con cadenza limitata, e ogni invio viene **ritentato con backoff** sui soli errori SMTP temporanei (421/450/451 e i 550 "temporarily rejected" di Aruba); gli errori permanenti (indirizzo inesistente) falliscono subito senza retry inutili. L'autenticazione email (SPF/DKIM/DMARC) era già corretta: il problema era solo il rate-limit di Aruba sugli invii a raffica.

### Infrastructure
- Nuovo modello Prisma `EmailLog` (+ enum `EmailLogStatus`) con migration `add_email_log`. Ogni invio viene registrato nel punto centrale `sendEmail` (`server/services/emailService.ts`) e nelle email eventi/simulazioni (`lib/email/eventEmails.ts`), tramite l'helper condiviso `logEmail`. La scrittura del log non può mai far fallire l'invio. Nuovo router tRPC admin `emailLog` (`getAll` paginato + `getStats`).

## [1.2.2] - 2026-07-03

### Changed
- **Email di benvenuto (creazione utente da admin) unificata al template email condiviso.** Il messaggio "Imposta la tua password" ora usa lo stesso template brandizzato (header/footer, pulsante, box informativi) delle altre email transazionali, per un aspetto coerente.

### Infrastructure
- Rimossa la duplicazione del trasporto SMTP: `sendWelcomeEmail` è stata spostata da `lib/email/userEmails.ts` (eliminato) a `server/services/emailService.ts`, riutilizzando `sendEmail` e `getBaseEmailTemplate`. Nessuna modifica alla firma della funzione né al flusso di invio.

## [1.2.1] - 2026-07-01

### Fixed
- **Gli eventi calendario delle simulazioni sparivano (regressione della 1.1.1).** Dalla 1.1.1 gli eventi delle assegnazioni usano il **titolo nudo** della simulazione, ma quel titolo coincide con l'evento programmato della simulazione stessa (`createSimulationCalendarEvent`, collegato via `calendarEventId`). Due percorsi di cancellazione basati sul titolo lo intercettavano per errore:
  - **Rimozione di un'assegnazione** (`removeAssignment`): cancellava per titolo tutti gli eventi `SIMULATION`, compreso l'evento programmato condiviso dalla classe. Ora quell'evento è **escluso esplicitamente** dalla cancellazione (matcha per id `calendarEventId`), quindi togliere una singola assegnazione non cancella più l'evento dell'intera classe.
  - **Eliminazione di una simulazione** (`delete`): usava un match a **sottostringa** (`title contains`) che cancellava gli eventi di *tutte* le simulazioni il cui titolo conteneva quel testo (es. eliminare "IMAT"/"SNT" azzerava gli eventi di ogni simulazione contenente "IMAT"/"SNT"). Ora la cancellazione è a **corrispondenza esatta** del titolo (più l'evento programmato per id), senza più il match a sottostringa.

### Infrastructure
- Aggiunto lo script una-tantum `pnpm normalize:sim-events` (con `:dry` per l'anteprima) che rimuove il prefisso legacy `TOLC: ` / `Simulazione: ` dai titoli degli eventi calendario `SIMULATION` già presenti nel DB, creati prima della 1.1.1. Gli eventi nuovi già usano il titolo nudo.

## [1.2.0] - 2026-07-01

### Changed
- **Autoesercitazioni – motore di selezione domande riscritto per non ripetere sempre le stesse domande.** Prima il pool candidato veniva pre-tagliato dal DB con un ordinamento **deterministico** (`take: N×3` / `N×5` con `orderBy` su `timesUsed`/`id`/`createdAt`) e solo dopo mescolato: poiché `timesUsed` non veniva mai aggiornato (restava sempre `0`), ogni esercitazione ripescava sempre lo stesso sottoinsieme iniziale di domande, indipendentemente dalla materia. Ora la selezione:
  - **Campiona in modo uniforme sull'intero pool ammissibile** (recupera prima solo gli id, poi i dati completi delle domande scelte), eliminando la finestra deterministica.
  - **Ricorda le domande già viste dallo studente** (per-studente, lato server): le domande mai viste vengono proposte per prime, e solo quando il bank è esaurito si ripescano le domande viste, partendo da quelle viste meno di recente. Vale sia per le autoesercitazioni libere (multi-materia / per materia) sia per quelle da template. L'opzione "Evita domande usate di recente" del modal ora guida davvero questo comportamento.
- Le autoesercitazioni ora **incrementano `timesUsed`** delle domande utilizzate (in transazione con la creazione della simulazione), così la statistica di utilizzo mostrata nel dettaglio domanda è finalmente corretta.

### Fixed
- `secureShuffleArray` **non crasha più su pool molto grandi**: `crypto.getRandomValues` rifiuta viste oltre 65536 byte (16384 `uint32`), quindi il riempimento avviene ora a blocchi. Prima uno shuffle di oltre ~16k elementi avrebbe sollevato un'eccezione.

## [1.1.1] - 2026-07-01

### Changed
- Calendar events created when assigning a simulation now use the **simulation name as-is**, without the `TOLC: ` / `Simulazione: ` prefix (the event is already tagged as a simulation). Deletion of assignment events still matches the old prefixed titles, so events created before this change are cleaned up correctly.

### Fixed
- Simulation assignments list (`getAssignments`) **crashed with a 500** for group assignments whose group contains collaborator members. Group members can be a student *or* a collaborator (`studentId` is nullable), and the `null` ids were passed into a Prisma `studentId: { in: [...] }` filter, which Prisma rejects. The query now filters to students only. The **"Assegnazioni" tab no longer shows a misleading "Nessuna assegnazione trovata"** empty state on error.
- Errors are **no longer silent**: the "Assegnazioni" tab (admin and collaborator) now shows a readable error message with a **"Riprova"** button when the query fails, instead of a blank/empty state.
- API errors are now **always logged server-side** (previously only in development) and **never leak raw technical text** (Prisma queries, stack details) to the browser. Unexpected server errors are replaced with a plain Italian message before reaching the client, while our own validation/permission messages pass through unchanged.
- Question/answer **images now appear everywhere a question is shown**, not just in the TOLC layout and admin question detail. Previously several views rendered only the question text and dropped the picture stored in the `imageUrl` field — so figures were missing for students (e.g. CINECA-imported questions, whose text keeps a raw `\includegraphics{filename}` that can't be resolved client-side while the real picture lives in `imageUrl`). Fixed views:
  - **Standard simulation player** (`QuestionPanel`) — the main test-taking layout: question image + per-answer images.
  - **Result review** (`/simulazioni/[id]/risultato`) — question image + answer images in the per-question breakdown.
  - **Study mode** (`/simulazioni/studio`) — question image + answer images.
  - **Simulation print sheet** (`/simulazioni/[id]/stampa`) — added the per-answer images (the question image was already printed).
  - **Staff simulation detail** — shows the question image and correct-answer images when a question row is expanded.
  - **Open-answer correction** (`/simulazioni/risposte-aperte/[id]`) — shows the question image.
  - **Student simulations history** (`/studenti/[id]/simulazioni`) — shows the image on each wrong question.
  The relevant tRPC queries now also select `imageUrl`/`imageAlt` where they weren't before (`getResultDetails`, `getByIds`, `getOpenAnswersForResult`, `getStudentSimulations`).
- Text rendering: a bare-filename `\includegraphics{file.png}` (with no path or URL) is **no longer turned into a broken `<img>`**. Such references only come from imports that also store the real picture in `imageUrl`, and the token-less Firebase URL they produced returned 403 — showing a broken image and causing layout jumps. They are now stripped, and the picture is served from `imageUrl` instead.

## [1.1.0] - 2026-06-24

### Added
- Simulation question management ("Gestione Domande"): added a **topic ("argomento") filter** to the "Domande disponibili" panel, alongside the existing subject, difficulty and type filters. The topic list is scoped to the selected subject (or shows all topics across subjects when none is selected) and resets when the subject changes. Available both when creating a simulation and when editing an existing one.

### Changed
- Editing an existing simulation's questions now supports **reordering questions with up/down arrows in the sectioned view** (and in the "Senza sezione" bucket), matching the flat-list behaviour. Arrows move a question only within its own section so section boundaries are preserved; within each section questions are now listed in their actual simulation order.

### Fixed
- Simulations list: the **search box no longer blanks the page and loses focus on every keystroke**. The list now keeps the previous rows visible while the new search/filter result loads (`keepPreviousData`), and the full-page loader only shows on the very first load. Applies to both the admin and collaborator views.
- Simulations list: the **row actions menu (⋮) now opens correctly under the button** instead of being pushed off-screen when the page is scrolled. The menu is `position: fixed`, so its coordinates are computed from the viewport without adding scroll offsets — fixing both the misplacement and the cases where the menu appeared not to open. Applies to the simulation and assignment action menus in both views.
- Simulation detail: the **progressive question number badges are now sequential** within each section. Questions are listed in their actual simulation order (the `order` field) instead of the raw section membership order, so after reordering or deleting questions the numbers no longer appear scrambled/out of sequence.
- Edit simulation: form fields **no longer reset to their previous value** while editing. The form is now populated from the server only once per simulation instead of on every background refetch (e.g. on window focus), which was overwriting in-progress edits as soon as the user moved to the next field.

## [1.0.2] - 2026-06-18

### Fixed
- Contract assignment: the rendered/printed contract document now shows the admin-overridden amount (`priceSnapshot`) instead of the original template price. The "Importo" field kept the template price even when the admin changed it while personalizing the template.
- Revenue stats now sum each contract's frozen `priceSnapshot` (falling back to the template price for older contracts), so admin price overrides are reflected in totals and monthly revenue.

## [1.0.1] - 2026-06-18

### Changed
- "Fill section": questions are now drawn (and listed) following a fixed type order — single-answer first, then open-answer — instead of the previous open-first order. The per-type split summary reflects the same order.
- Homepage hero background reworked into an interactive pseudo-3D "molecular universe": a rotating DNA double-helix core whose rungs are complementary base pairs (A-T / G-C, each nucleotide colour-coded), surrounded by a network of chemistry/physics/math/biology notation (incl. DNA, RNA, NADH, ATP, Hb) linked by bonds, with electrons orbiting nuclei and signal pulses travelling along the bonds like nerve impulses. It has perspective depth, a framing vignette, tilts toward the pointer (mouse/touch), and renders on a plain 2D canvas with no new dependencies. Particle count and pixel density scale down on mobile; the animation respects `prefers-reduced-motion` (static frame) and pauses when off-screen or the tab is hidden. Replaces the previous static CSS symbol layer (`ScienceCanvasLight`).

## [1.0.0] - 2026-06-18

First tracked release: from here on every change bumps the version and updates this changelog.

### Added
- Inline image support in questions and simulations, with optimized rendering in print too.
- Structured name handling (`firstName`/`lastName`) and price snapshot on contracts.
- Admin onboarding: the admin can activate/deactivate the account and assign/revoke contracts **before** the student confirms their profile; on first login the student finds the admin-entered personal data **already pre-filled** and editable. Autonomous self-registration is unchanged.
- Discreet version badge in the frontend (bottom-left), hidden in print.

### Changed
- Login: email and password are trimmed before being sent to Firebase, fixing the "same credentials work on one device but not another" cases caused by autofill/copy-paste.

### Fixed
- Uploading materials into a folder: `materials.createBatch` linked the folder through a non-existent `category` field; it now correctly uses the many-to-many `categories` relation (`MaterialCategoryLink`).
- Removed a useless reassignment of `globalQuestionNumber` in simulation printing (a lint error that broke the CI build).

### Infrastructure / Database
- Adopted **Prisma migrations**: created the initial `0_init` migration and baselined local, test and production (Neon) databases with no data loss.
- `prisma.config.ts` uses Neon's **direct** connection (`DATABASE_URL_UNPOOLED`) for CLI commands, falling back to `DATABASE_URL` locally.
- Automatic migration deploy on Vercel: `scripts/prisma-deploy.ts` runs `prisma migrate deploy` **only** on production builds (never on preview or locally).
- Fixed `pnpm lint` locally: reinstalled `@babel/core` (corrupted in the pnpm store) and added it as an explicit dependency.

[Unreleased]: https://github.com/marcimastro98/leonardoschool/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/marcimastro98/leonardoschool/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/marcimastro98/leonardoschool/releases/tag/v1.0.0
