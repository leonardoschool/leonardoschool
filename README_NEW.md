# 🎓 Leonardo School - Piattaforma Preparazione Test Universitari

Piattaforma completa per la preparazione ai test di ammissione universitaria, con sito vetrina e webapp gestionale.

## 📁 Struttura Progetto

```
leonardoschool/
├── app/
│   ├── (marketing)/          # Sito pubblico (vetrina)
│   │   ├── page.tsx          # Homepage
│   │   ├── chi-siamo/
│   │   ├── contattaci/
│   │   ├── didattica/
│   │   └── ...
│   │
│   ├── (app)/                # Area applicativa (privata)
│   │   ├── studente/         # Dashboard studente
│   │   └── admin/            # Dashboard admin
│   │
│   ├── auth/                 # Autenticazione
│   │   ├── login/
│   │   └── registrati/
│   │
│   ├── api/                  # API Routes
│   │   ├── trpc/            # tRPC endpoints
│   │   ├── upload/
│   │   └── webhooks/
│   │
│   └── layout.tsx            # Root layout
│
├── components/
│   ├── layout/               # Header, Footer, Sidebar
│   ├── ui/                   # UI components riutilizzabili
│   ├── student/              # Componenti studente
│   └── admin/                # Componenti admin
│
├── lib/
│   ├── firebase/             # Firebase Auth + Storage
│   ├── prisma/               # Prisma client
│   ├── trpc/                 # tRPC client setup
│   ├── hooks/                # React hooks custom
│   ├── stores/               # Zustand stores
│   └── validations/          # Zod schemas
│
├── server/
│   ├── trpc/                 # tRPC backend logic
│   │   ├── routers/
│   │   └── context.ts
│   └── services/             # Business logic
│
├── prisma/
│   └── schema.prisma         # Database schema
│
└── types/                    # TypeScript types
```

## 🛠️ Stack Tecnologico

### Frontend
- **Next.js 16** - React framework con App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

### Backend
- **tRPC** - Type-safe API
- **Prisma** - ORM per PostgreSQL
- **PostgreSQL** - Database principale
- **Firebase Auth** - Autenticazione utenti
- **Firebase Storage** - Storage file/PDF

### State Management
- **Zustand** - Global state
- **React Query** - Server state (via tRPC)

## 🚀 Setup Iniziale

### 1. Installa dipendenze

```bash
pnpm install
```

### 2. Configura variabili d'ambiente

Copia `.env.example` in `.env.local` e compila con i tuoi valori:

```bash
cp .env.example .env.local
```

### 3. Setup Database

```bash
# Genera Prisma Client
pnpm prisma generate

# Esegui migrations
pnpm prisma migrate dev

# (Opzionale) Seed database con dati di test
pnpm prisma db seed
```

### 4. Avvia il progetto

```bash
pnpm dev
```

Il sito sarà disponibile su [http://localhost:3000](http://localhost:3000)

## 📋 Script Disponibili

```bash
pnpm dev          # Avvia dev server
pnpm build        # Build per produzione
pnpm start        # Avvia produzione
pnpm lint         # Lint del codice
pnpm prisma:studio # Apri Prisma Studio (DB GUI)
```

## 🔐 Autenticazione

L'app usa **Firebase Authentication** per gestire:
- Login/Registrazione email/password
- OAuth (Google, Facebook - opzionale)
- Reset password
- Email verification

I metadati utente (ruoli, profili) sono salvati in PostgreSQL.

## 🗄️ Database

### Modelli Principali

- **User** - Utenti (collegato a Firebase)
- **Student** - Profilo studente
- **Admin** - Profilo amministratore
- **Question** - Domande dei test
- **Simulation** - Simulazioni/test
- **SimulationResult** - Risultati studenti

## 📱 Future: Mobile App (Expo)

La struttura è pronta per aggiungere un'app mobile con Expo che condividerà:
- API tRPC
- Types TypeScript
- Business logic
- Firebase Auth/Storage

## 🌐 Deploy

### Vercel (Consigliato per Next.js)
```bash
vercel
```

### Database
- **Neon** - PostgreSQL serverless (free tier)
- **Railway** - PostgreSQL managed
- **Supabase** - PostgreSQL + Auth + Storage (alternativa a Firebase)

## 📄 License

Private - Leonardo School © 2025
