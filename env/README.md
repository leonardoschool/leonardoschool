# 📁 Cartella Environment Variables

Questa cartella contiene le configurazioni per i diversi ambienti.

## 📄 File presenti

| File | Ambiente | Usato quando |
|------|----------|--------------|
| `.env.local` | Sviluppo locale | `pnpm dev` con Docker PostgreSQL |
| `.env.test` | Test/Staging | Deploy su Vercel test con Neon DB |
| `.env.production` | Produzione | Deploy finale (quando pronto) |
| `.env.example` | Template | Esempio per nuovi sviluppatori |

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
