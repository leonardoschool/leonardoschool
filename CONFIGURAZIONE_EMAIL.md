# 📧 Configurazione Email per Leonardo School

## Setup SMTP con Aruba

Questo progetto utilizza **Nodemailer** con SMTP di Aruba per inviare email dal form di contatto.

---

## ⚙️ Configurazione

### 1. Crea una casella email su Aruba

1. Accedi al pannello di controllo Aruba
2. Vai su **"Email e Microsoft 365"** → **"Gestione Email"**
3. Crea una casella email (es. `info@leonardoschool.it`)
4. Annota username e password

### 2. Configura le variabili d'ambiente

1. Copia il file `.env.example` in `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Modifica `.env.local` con le tue credenziali:
   ```env
   SMTP_HOST=smtps.aruba.it
   SMTP_PORT=465
   SMTP_SECURE=true
   
   # Sostituisci con le tue credenziali
   SMTP_USER=info@leonardoschool.it
   SMTP_PASSWORD=la_tua_password_qui
   
   EMAIL_FROM=info@leonardoschool.it
   EMAIL_TO=info@leonardoschool.it
   
   NEXT_PUBLIC_SITE_URL=https://www.leonardoschool.it
   ```

### 3. Configurazione su Vercel (Produzione)

Quando fai il deploy su Vercel, aggiungi le variabili d'ambiente:

1. Vai su **Vercel Dashboard** → Il tuo progetto → **Settings** → **Environment Variables**
2. Aggiungi tutte le variabili da `.env.local`
3. Seleziona **Production**, **Preview**, e **Development**

---

## 🧪 Test in locale

1. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

2. Vai su `http://localhost:3000/contattaci`

3. Compila e invia il form di contatto

4. Controlla la casella email configurata in `EMAIL_TO`

---

## 📋 Credenziali SMTP Aruba

| Parametro | Valore |
|-----------|--------|
| **Host SMTP** | `smtps.aruba.it` |
| **Porta** | `465` (SSL) o `587` (TLS) |
| **Sicurezza** | SSL/TLS |
| **Username** | Email completa (es. `info@leonardoschool.it`) |
| **Password** | Password della casella email |

---

## ⚠️ Sicurezza

- ✅ Il file `.env.local` è già nel `.gitignore`
- ✅ **NON** committare mai le password nel repository
- ✅ Usa variabili d'ambiente diverse per sviluppo e produzione
- ✅ Su Vercel, le variabili d'ambiente sono criptate

---

## 🐛 Troubleshooting

### Email non arrivano?

1. **Verifica le credenziali** in `.env.local`
2. **Controlla lo spam** nella casella destinatario
3. **Verifica i log** di Vercel o nel terminale locale
4. **Testa le credenziali** con un client email (Outlook, Thunderbird)

### Errore "Authentication failed"?

- Verifica username (deve essere email completa)
- Verifica password (prova a reimpostarla su Aruba)
- Assicurati che SMTP sia abilitato sulla casella Aruba

### Timeout connection?

- Verifica che la porta `465` non sia bloccata dal firewall
- Prova con porta `587` e `SMTP_SECURE=false`

---

## 📞 Supporto

Per problemi con SMTP Aruba, contatta il supporto tecnico Aruba o consulta la [documentazione ufficiale](https://guide.aruba.it/hosting/come-configurare-un-client-di-posta-elettronica.aspx).
