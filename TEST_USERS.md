# 🧪 Utenti di Test - Leonardo School

Questo file contiene le credenziali degli utenti di test creati dallo script di seed.

> ⚠️ **ATTENZIONE**: Questi utenti sono solo per sviluppo e test. Non usare in produzione!

---

## 🔐 Password comune

**Password per tutti gli utenti:** `TestPassword123!`

---

## 👑 Amministratori (3)

| Email | Nome | Password |
|-------|------|----------|
| admin1@leonardoschool.test | Mario Rossi | TestPassword123! |
| admin2@leonardoschool.test | Laura Bianchi | TestPassword123! |
| admin3@leonardoschool.test | Giuseppe Verdi | TestPassword123! |

---

## 👥 Collaboratori (10)

| Email | Nome | Telefono | Codice Fiscale | Password |
|-------|------|----------|----------------|----------|
| collab1@leonardoschool.test | Anna Ferrari | 3331234567 | FRRNNA80A01H501Z | TestPassword123! |
| collab2@leonardoschool.test | Marco Ricci | 3332345678 | RCCMRC85B02H501Z | TestPassword123! |
| collab3@leonardoschool.test | Giulia Marino | 3333456789 | MRNGLI90C03H501Z | TestPassword123! |
| collab4@leonardoschool.test | Francesco Romano | 3334567890 | RMNFNC88D04H501Z | TestPassword123! |
| collab5@leonardoschool.test | Sara Colombo | 3335678901 | CLMSRA92E05H501Z | TestPassword123! |

---

## 🎓 Studenti (20)

| Email | Nome | Telefono | Città | Password |
|-------|------|----------|-------|----------|
| studente1@leonardoschool.test | Matteo De Luca | 3341234567 | Roma | TestPassword123! |
| studente2@leonardoschool.test | Sofia Esposito | 3342345678 | Milano | TestPassword123! |
| studente3@leonardoschool.test | Lorenzo Fontana | 3343456789 | Napoli | TestPassword123! |
| studente4@leonardoschool.test | Giulia Santoro | 3344567890 | Torino | TestPassword123! |
| studente5@leonardoschool.test | Alessandro Moretti | 3345678901 | Bologna | TestPassword123! |

---

## 🚀 Come usare

### Login rapido
1. Vai su http://localhost:3000/auth/login
2. Inserisci una delle email sopra
3. Usa la password `TestPassword123!`

### Ruoli e permessi
- **Admin**: Accesso completo a tutte le pagine, gestione utenti, contratti, candidature
- **Collaboratore**: Accesso a domande, tags, materiali, presenze, studenti assegnati
- **Studente**: Accesso a simulazioni, materiali, calendario, statistiche personali

### Rigenerare gli utenti
```bash
pnpm seed
```

---

## 📁 Dettagli studenti completi

<details>
<summary>Clicca per espandere i dettagli completi degli studenti</summary>

| Email | Nome | CF | Data Nascita | Luogo Nascita | Indirizzo | CAP | Provincia |
|-------|------|-----|--------------|---------------|-----------|-----|-----------|
| studente1@leonardoschool.test | Matteo De Luca | DLCMTT02A01H501Z | 2002-01-15 | Roma | Via Roma 123 | 00100 | RM |
| studente2@leonardoschool.test | Sofia Esposito | SPSSFO03B02H501Z | 2003-02-20 | Milano | Via Milano 45 | 20100 | MI |
| studente3@leonardoschool.test | Lorenzo Fontana | FNTLRN02C03H501Z | 2002-03-25 | Napoli | Via Napoli 67 | 80100 | NA |
| studente4@leonardoschool.test | Giulia Santoro | SNTGLI03D04H501Z | 2003-04-10 | Torino | Via Torino 89 | 10100 | TO |
| studente5@leonardoschool.test | Alessandro Moretti | MRTLSN02E05H501Z | 2002-05-15 | Bologna | Via Bologna 12 | 40100 | BO |
| studente6@leonardoschool.test | Francesca Leone | LNEFNC03F06H501Z | 2003-06-20 | Firenze | Via Firenze 34 | 50100 | FI |
| studente7@leonardoschool.test | Marco Benedetti | BNDMRC02G07H501Z | 2002-07-25 | Genova | Via Genova 56 | 16100 | GE |
| studente8@leonardoschool.test | Valentina Serra | SRRVNT03H08H501Z | 2003-08-30 | Palermo | Via Palermo 78 | 90100 | PA |
| studente9@leonardoschool.test | Gabriele Vitale | VTLGBR02I09H501Z | 2002-09-05 | Catania | Via Catania 90 | 95100 | CT |
| studente10@leonardoschool.test | Martina Orlando | RLNMRT03L10H501Z | 2003-10-10 | Venezia | Via Venezia 23 | 30100 | VE |
| studente11@leonardoschool.test | Andrea Ferri | FRRNDR02M11H501Z | 2002-11-15 | Verona | Via Verona 45 | 37100 | VR |
| studente12@leonardoschool.test | Beatrice Mancini | MNCBTR03N12H501Z | 2003-12-20 | Padova | Via Padova 67 | 35100 | PD |
| studente13@leonardoschool.test | Riccardo Greco | GRCRCC02A13H501Z | 2002-01-25 | Trieste | Via Trieste 89 | 34100 | TS |
| studente14@leonardoschool.test | Camilla Russo | RSSCML03B14H501Z | 2003-02-28 | Bari | Via Bari 12 | 70100 | BA |
| studente15@leonardoschool.test | Tommaso Marchetti | MRCTMS02C15H501Z | 2002-03-10 | Brescia | Via Brescia 34 | 25100 | BS |
| studente16@leonardoschool.test | Alice Monti | MNTLCA03D16H501Z | 2003-04-15 | Parma | Via Parma 56 | 43100 | PR |
| studente17@leonardoschool.test | Edoardo Barbieri | BRBRDR02E17H501Z | 2002-05-20 | Modena | Via Modena 78 | 41100 | MO |
| studente18@leonardoschool.test | Emma Silvestri | SLVMMA03F18H501Z | 2003-06-25 | Reggio Emilia | Via Reggio 90 | 42100 | RE |
| studente19@leonardoschool.test | Nicolò Lombardi | LMBNCL02G19H501Z | 2002-07-30 | Piacenza | Via Piacenza 12 | 29100 | PC |
| studente20@leonardoschool.test | Greta Pellegrini | PLLGRT03H20H501Z | 2003-08-05 | Ravenna | Via Ravenna 34 | 48100 | RA |

</details>

---

*Ultimo aggiornamento: Dicembre 2025*
