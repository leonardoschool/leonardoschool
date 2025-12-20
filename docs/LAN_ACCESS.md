# Accesso da Rete Locale (LAN)

Questa guida ti aiuta a configurare l'applicazione per l'accesso da altri dispositivi nella stessa rete locale.

## Problema
Quando provi ad accedere da un altro PC, l'autenticazione fallisce perché l'app usa `localhost:3000`, che funziona solo sul PC dove gira il server.

## Soluzione

### 1. Trova l'IP locale del tuo Mac

Apri il Terminale e digita:

```bash
ipconfig getifaddr en0  # Per WiFi
# oppure
ipconfig getifaddr en1  # Per Ethernet
```

Otterrai un IP tipo: `192.168.1.100` (il tuo IP locale)

### 2. Avvia il server in modalità LAN

Invece di `pnpm dev`, usa:

```bash
pnpm dev:lan
```

Vedrai un output tipo:
```
- Local:        http://localhost:3000
- Network:      http://192.168.1.100:3000
```

### 3. Configura Firebase per accettare il nuovo dominio

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il tuo progetto
3. Vai su **Authentication** > **Settings** > **Authorized domains**
4. Aggiungi il tuo IP locale: `192.168.1.100` (senza porta, senza http://)

### 4. Accedi dall'altro PC

Dall'altro PC nella stessa rete, apri il browser e vai su:

```
http://192.168.1.100:3000
```

(Sostituisci `192.168.1.100` con il tuo IP locale)

## Risoluzione Problemi

### L'altro PC non si connette
- Verifica che il Mac non abbia il firewall attivo che blocca le connessioni in entrata
- Controlla che entrambi i dispositivi siano sulla stessa rete WiFi
- Prova a pingare il Mac dall'altro PC: `ping 192.168.1.100`

### Errore "authMe.batch" failed
- Verifica di aver aggiunto l'IP ai domini autorizzati in Firebase
- Assicurati di usare `pnpm dev:lan` invece di `pnpm dev`
- Controlla che il database PostgreSQL sia attivo: `docker ps`

### Database non accessibile
Se anche il database deve essere accessibile da altri PC:

```bash
# In docker-compose.yml, modifica il binding della porta:
ports:
  - "0.0.0.0:5433:5432"  # Invece di "127.0.0.1:5433:5432"
```

Poi riavvia Docker:
```bash
docker-compose down
docker-compose up -d
```

## Note di Sicurezza

⚠️ **Attenzione**: Questa configurazione è solo per sviluppo in rete locale. 

**NON usare in produzione senza:**
- Certificati SSL/TLS (HTTPS)
- Firewall configurato correttamente
- Autenticazione forte
- Rate limiting
- Network isolation

## Tornare alla configurazione localhost

Per tornare alla normale configurazione locale:

1. Usa `pnpm dev` invece di `pnpm dev:lan`
2. Rimuovi l'IP dai domini autorizzati in Firebase (opzionale)
