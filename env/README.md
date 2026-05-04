# 📁 Cartella Environment Variables

Questa cartella contiene le configurazioni per i diversi ambienti.

## 📄 File presenti

| File | Ambiente | Database | Email |
|------|----------|----------|-------|
| `.env.local` | Sviluppo locale | Docker (localhost:5433) | Disabilitato |
| `.env.test` | Test/Staging | Neon PostgreSQL | Aruba SMTP |
| `.env.production` | Produzione | Neon PostgreSQL | Aruba SMTP |
| `.env.example` | Template | - | Template |

## 🔄 Come switchare ambiente

```bash
# Sviluppo locale (default)
pnpm env:local

# Ambiente test (Neon DB)
pnpm env:test

# Produzione
pnpm env:prod

# Vedere ambiente attivo
pnpm env:current
```

## 📧 Configurazione Email (SMTP)

Le email vengono inviate tramite SMTP Aruba. Variabili necessarie:

```env
SMTP_HOST=""
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=""
SMTP_PASSWORD=""
EMAIL_FROM=""
EMAIL_TO=""
```

**Note:**
- In locale (`.env.local`) le email sono commentate/disabilitate
- In test e produzione sono già configurate

## ⚠️ Sicurezza

- **MAI committare** i file `.env.*` con credenziali reali
- Tutti i file `.env*` sono in `.gitignore`
- Solo `.env.example` può essere committato (senza valori reali)

## 🔧 Come funziona

1. I file in `env/` contengono le config per ogni ambiente
2. Lo script `pnpm env:xxx` copia il file corretto in `.env` (root)
3. Next.js/Prisma leggono sempre da `.env` nella root
4. Il file `.env` attivo è ignorato da git

## 📋 Setup nuovo ambiente

1. Copia `.env.example` con nuovo nome
2. Compila le variabili
3. Aggiungi comando in `package.json` se serve
