# 🎓 Leonardo School - Web Application

Piattaforma web completa per la preparazione ai test d'ammissione universitari (Medicina, Odontoiatria, Veterinaria, Professioni Sanitarie, Architettura, TOLC).

---

## 📋 Indice

- [Architettura](#-architettura)
- [Requisiti](#-requisiti)
- [Installazione](#-installazione)
- [Comandi Disponibili](#-comandi-disponibili)
- [Struttura Progetto](#-struttura-progetto)
- [Autenticazione](#-autenticazione)
- [Database](#-database)
- [API (tRPC)](#-api-trpc)
- [Logging](#-logging)
- [Sicurezza](#-sicurezza)
- [Sistema Colori](#-sistema-colori)
- [Seeding Dati di Test](#-seeding-dati-di-test)
- [Email & SMTP](#-email--smtp)
- [SEO](#-seo)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## 🏗️ Architettura

**Stack Tecnologico:**
- **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS
- **Backend**: tRPC + Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Autenticazione**: Firebase Auth (client) + Firebase Admin SDK (server)
- **Storage**: Firebase Storage (per CV, documenti)
- **State Management**: Zustand + TanStack Query

**Architettura Monolite Modulare** (non microservizi):
- ✅ Deployment singolo
- ✅ Type-safety end-to-end
- ✅ Nessun overhead di network tra servizi
- ✅ Perfect fit per team piccoli/medi

### Route Groups

```
app/
├── (marketing)/      → Pagine pubbliche SEO (Header/Footer)
│   ├── page.tsx      → Homepage
│   ├── chi-siamo/    → About
│   ├── contattaci/   → Contact
│   ├── didattica/    → Courses
│   └── ...
├── (app)/            → Dashboard protette (route unificate)
│   ├── dashboard/    → Dashboard (Admin/Collaboratore/Studente)
│   ├── simulazioni/  → Simulazioni test
│   ├── calendario/   → Calendario eventi
│   ├── messaggi/     → Messaggistica
│   └── ...           → Altre pagine con contenuto role-based
├── auth/             → Pagine autenticazione
│   ├── login/
│   ├── registrati/
│   └── complete-profile/
└── api/              → API Routes
```

---

## 📦 Requisiti

- **Node.js** >= 18.17
- **pnpm** >= 8.0 (raccomandato) o npm
- **PostgreSQL** >= 14
- **Docker** (opzionale, per database locale)

---

## 🚀 Installazione

### 1. Clona il repository
```bash
git clone https://github.com/marcimastro98/leonardoschool.git
cd leonardoschool
```

### 2. Installa dipendenze
```bash
pnpm install
```

### 3. Configura environment variables
```bash
cp .env.example .env
```

Compila `.env` con:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5433/leonardoschool"

# Firebase Client (pubbliche)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Firebase Admin (privata - JSON string)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# reCAPTCHA
NEXT_PUBLIC_RECAPTCHA_SITE_KEY="..."
RECAPTCHA_SECRET_KEY="..."

# Email SMTP
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="noreply@example.com"
SMTP_PASSWORD="..."
EMAIL_FROM="noreply@leonardoschool.it"
EMAIL_TO="info@leonardoschool.it"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Avvia database PostgreSQL
```bash
# Con Docker
docker-compose up -d

# Oppure usa PostgreSQL locale (porta 5433)
```

### 5. Genera Prisma client e migra database
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

### 6. (Opzionale) Popola con dati di test
```bash
pnpm seed
```

### 7. Avvia server di sviluppo
```bash
pnpm dev
```

Apri [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Comandi Disponibili

| Comando | Descrizione |
|---------|-------------|
| `pnpm dev` | Avvia server di sviluppo (localhost:3000) |
| `pnpm build` | Build per produzione |
| `pnpm start` | Avvia server produzione |
| `pnpm lint` | Esegue ESLint |
| `pnpm prisma:generate` | Genera Prisma client (⚠️ dopo ogni modifica schema) |
| `pnpm prisma:migrate` | Applica migrazioni database |
| `pnpm prisma:studio` | Apre GUI database (localhost:5555) |
| `pnpm seed` | Popola database con dati di test (dev only) |
| `pnpm seed:firebase` | Crea utenti in Firebase Auth (dev only) |

---

## 📁 Struttura Progetto

```
leonardoschool/
├── app/                    # Next.js App Router
│   ├── (marketing)/        # Pagine pubbliche
│   ├── (app)/              # Dashboard protette
│   ├── api/                # API Routes
│   └── auth/               # Pagine auth
├── components/             # Componenti React
│   ├── admin/              # Componenti admin
│   ├── layout/             # Header, Footer
│   ├── marketing/          # Homepage sections
│   └── ui/                 # UI components riutilizzabili
├── lib/                    # Utilities e configurazioni
│   ├── firebase/           # Firebase client & admin SDK
│   ├── hooks/              # Custom React hooks
│   ├── middleware/         # Rate limiting, etc
│   ├── prisma/             # Prisma client
│   ├── theme/              # Sistema colori
│   ├── trpc/               # tRPC client
│   ├── utils/              # Utility functions
│   └── validations/        # Zod schemas
├── server/                 # Backend logic
│   ├── services/           # Email, etc
│   └── trpc/               # tRPC routers
├── prisma/                 # Database schema
│   ├── schema.prisma       # Schema Prisma
│   └── seed.ts             # Script seeding
├── scripts/                # Script utility
│   └── seed-complete.ts    # Seed Firebase + PostgreSQL
├── public/                 # Static assets
└── types/                  # TypeScript types
```

---

## 🔐 Autenticazione

### Flusso Completo

```
1. Client: firebaseAuth.login() / register()
           ↓
2. Client: POST /api/auth/me (con Firebase token)
           ↓
3. Server: Verifica token Firebase
           ↓
4. Server: Sincronizza utente in PostgreSQL
           ↓
5. Server: Setta cookies:
           - auth-token (HttpOnly, 7 giorni)
           - user-role (per routing)
           - profile-completed (per redirect)
           ↓
6. Client: Redirect in base a ruolo/profilo
```

### Ruoli Utente

| Ruolo | Descrizione | Dashboard |
|-------|-------------|-----------|
| `ADMIN` | Amministratore | `/admin` |
| `COLLABORATOR` | Tutor/Collaboratore | `/collaboratore` |
| `STUDENT` | Studente | `/studente` |

### Stati Utente

- **profileCompleted = false**: Redirect a `/auth/complete-profile`
- **isActive = false**: Account non attivo (richiede approvazione admin)
- **emailVerified = false**: Email non verificata

### File Chiave

- `lib/firebase/auth.ts` - Client auth functions
- `lib/firebase/admin.ts` - Server Firebase Admin
- `app/api/auth/me/route.ts` - Sync endpoint
- `proxy.ts` - Middleware protezione route
- `server/trpc/context.ts` - Context tRPC con user

---

## 🗄️ Database

### Schema Prisma

```prisma
// Ruoli
enum UserRole { ADMIN, COLLABORATOR, STUDENT }

// Materie gestite dinamicamente dagli admin
model CustomSubject { id, name, code, color, icon, ... }

// Modelli principali
model User { ... }          // Utente base
model Student { ... }       // Profilo studente
model Collaborator { ... }  // Profilo collaboratore
model Admin { ... }         // Profilo admin

// Simulazioni
model Simulation { ... }    // Test/simulazione
model Question { ... }      // Domanda
model Answer { ... }        // Risposta

// Contratti
model ContractTemplate { ... }
model Contract { ... }

// Gruppi e materiali
model Group { ... }
model Material { ... }
```

### Comandi Utili

```bash
# Visualizza database
pnpm prisma:studio

# Reset database
pnpm prisma:migrate reset

# Push schema senza migration
pnpm prisma:push
```

---

## 🔌 API (tRPC)

### Procedures Disponibili

```typescript
// server/trpc/init.ts
publicProcedure      // Nessuna auth richiesta
protectedProcedure   // Richiede autenticazione
adminProcedure       // Solo ADMIN
staffProcedure       // ADMIN o COLLABORATOR
collaboratorProcedure// Solo COLLABORATOR
studentProcedure     // Solo STUDENT
```

### Routers

| Router | Descrizione |
|--------|-------------|
| `auth` | Registrazione, sync utente |
| `users` | Gestione utenti (admin) |
| `students` | Profili studenti |
| `collaborators` | Profili collaboratori |
| `questions` | Gestione domande |
| `simulations` | Simulazioni e test |
| `contracts` | Template e contratti |
| `groups` | Gruppi studenti |
| `materials` | Materiale didattico |
| `contactRequests` | Richieste contatto |
| `jobApplications` | Candidature lavoro |

### Esempio Utilizzo

```typescript
// Client component
const { data, isLoading } = trpc.users.getAll.useQuery();

// Mutation
const mutation = trpc.users.create.useMutation({
  onSuccess: () => showSuccess('Utente creato'),
  onError: handleMutationError,
});
```

---

## � Logging

Leonardo School utilizza un **sistema di logging centralizzato** con request tracking (simile a Spring Boot MDC).

### Quick Start

```typescript
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('MyModule');

log.info('Operazione completata', { userId: 123 });
// Output: [12:34:56.789] [req:a1b2c3d4] [MyModule] Operazione completata { userId: 123 }
```

### Request Tracking

Ogni richiesta ha un **Request ID univoco** (UUID) che appare in tutti i log correlati:

```bash
# Esempio di log con request tracking
[12:34:56.789] [req:a1b2c3d4] [Auth] User logged in
[12:34:57.123] [req:a1b2c3d4] [Database] User fetched from DB
[12:34:57.456] [req:a1b2c3d4] [Auth] JWT token created

# Per tracciare una richiesta specifica in production:
grep "req:a1b2c3d4" application.log
```

**Request ID nel Browser**: Ogni risposta API include l'header `x-request-id` visibile in DevTools → Network → Headers. Puoi copiarlo e cercarlo nei log server per debug end-to-end!

### Log Levels

| Level | Development | Production | Uso |
|-------|-------------|------------|-----|
| `debug` | ❌ No (solo con `LOG_VERBOSE=true`) | ❌ No | Log molto frequenti (heartbeat, polling) |
| `info` | ✅ Sì | ❌ No (solo con `ENABLE_PROD_LOGS=true`) | Operazioni normali |
| `warn` | ✅ Sì | ✅ Sì | Warning non bloccanti |
| `error` | ✅ Sì | ✅ Sì | Errori che richiedono attenzione |

### Configurazione Log

```bash
# .env.local

# Abilita log query Prisma (utile per debug)
LOG_PRISMA_QUERIES=true

# Abilita log debug/verbose
LOG_VERBOSE=true

# Production: abilita log info (non raccomandato)
ENABLE_PROD_LOGS=true
```

### Ridurre Log Noise in Development

I log HTTP di Next.js (`GET /dashboard 200 in 2.3s`) sono normali in development. Per ridurli:

```bash
# Opzione 1: Filtra con grep (raccomandato)
pnpm dev 2>&1 | grep -E "\[[0-9]{2}:[0-9]{2}:[0-9]{2}\]"  # Solo log del tuo logger
pnpm dev 2>&1 | grep -v "GET\|POST\|PUT\|DELETE"          # Escludi log HTTP

# Opzione 2: Disabilita tutti i log Next.js (SPERIMENTALE - non raccomandato)
NEXT_DISABLE_DEV_LOGGING=true pnpm dev
```

**In production** questi log sono già **minimizzati automaticamente** da Next.js.

📖 **Documentazione completa**: [docs/LOGGING.md](docs/LOGGING.md)

---

## �🔒 Sicurezza

### Misure Implementate

| Categoria | Implementazione |
|-----------|-----------------|
| **Autenticazione** | Firebase Auth + token verification server-side |
| **Cookies** | HttpOnly, Secure, SameSite=lax, 7 giorni |
| **XSS Protection** | `sanitizeHtml()` su tutti i contenuti HTML |
| **SQL Injection** | Prisma ORM (query parametrizzate) |
| **Rate Limiting** | Limiti su auth, contact form, reCAPTCHA |
| **Security Headers** | HSTS, X-Frame-Options, CSP headers |
| **Input Validation** | Zod schemas su tutti gli input |
| **CSRF** | reCAPTCHA v3 su registrazione |

### Rate Limiting

```typescript
// lib/middleware/rateLimit.ts
checkRateLimit(ip, 'auth')    // 5 req/min per auth
checkRateLimit(ip, 'contact') // 3 req/min per form
checkRateLimit(ip, 'api')     // 100 req/min generale
```

### Security Headers (next.config.ts)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 🎨 Sistema Colori

**⚠️ MAI usare hex hardcoded.** Usa sempre `lib/theme/colors.ts`:

```typescript
import { colors, generateDynamicSubjectColor } from '@/lib/theme/colors';

// ✅ Corretto - Colori brand
<div className={colors.primary.gradient} />

// ✅ Corretto - Colori materia dinamici dal database
const subjectColors = generateDynamicSubjectColor(subject.color);
<div style={{ backgroundColor: subjectColors.main }} />

// ❌ Sbagliato - Mai hardcodare colori materia
<div className="bg-[#D54F8A]" />
```

### Categorie Colori

- `colors.primary.*` - Rosso brand
- `colors.background.*` - Sfondi (supporta dark mode)
- `colors.status.*` - Success, warning, error
- `colors.text.*` - Colori testo
- `colors.border.*` - Bordi
- `generateDynamicSubjectColor(hex)` - Colori materia dal database

---

## 🌱 Seeding Dati di Test

### Quick Start

```bash
# Seed completo (Firebase + PostgreSQL)
pnpm seed
```

### Dati Creati

| Ruolo | Quantità | Email Pattern |
|-------|----------|---------------|
| Admin | 3 | admin1-3@leonardoschool.test |
| Collaboratori | 10 | collab1-10@leonardoschool.test |
| Studenti | 20 | studente1-20@leonardoschool.test |

> 📄 **Credenziali complete**: Vedi file `TEST_USERS.md` (non versionato, generato localmente)

### Note

- ⚠️ Funziona solo in development (`NODE_ENV !== 'production'`)
- 🗑️ Pulisce automaticamente dati precedenti `@leonardoschool.test`
- ✅ Tutti gli utenti sono verificati e attivi

### Workflow Reset Database

```bash
pnpm prisma:migrate reset  # Reset schema
pnpm prisma:generate       # Rigenera client
pnpm seed                  # Popola dati test
```

---

## 📧 Email & SMTP

### Configurazione

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="465"
SMTP_SECURE="true"
SMTP_USER="noreply@leonardoschool.it"
SMTP_PASSWORD="your-password"
EMAIL_FROM="noreply@leonardoschool.it"
EMAIL_TO="info@leonardoschool.it"
```

### Email Inviate

- ✉️ Conferma registrazione
- ✉️ Reset password (via Firebase)
- ✉️ Assegnazione contratto
- ✉️ Conferma firma contratto
- ✉️ Notifiche admin (nuova richiesta, candidatura)

### Provider Raccomandati

- **Development**: Mailtrap, Ethereal
- **Production**: SendGrid, Mailgun, Amazon SES

---

## 🔍 SEO

### Implementazioni

- ✅ Metadata dinamici per ogni pagina
- ✅ `sitemap.ts` generato automaticamente
- ✅ `robots.txt` configurato
- ✅ Structured data (JSON-LD)
- ✅ Open Graph e Twitter Cards
- ✅ Performance ottimizzata (Lighthouse 95+)

### Keywords Target

```
preparazione test medicina catania
corsi test ammissione
simulazioni test medicina
```

### File SEO

- `app/sitemap.ts` - Sitemap dinamica
- `public/robots.txt` - Configurazione crawler
- `lib/constants.ts` - Meta comuni

---

## 🚀 Deployment

### Vercel (Raccomandato)

1. Connetti repository GitHub
2. Configura environment variables
3. Deploy automatico su push

```bash
# Build command (auto-detected)
pnpm build

# Output directory
.next
```

### Docker

```bash
docker build -t leonardoschool .
docker run -p 3000:3000 leonardoschool
```

### Environment Production

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://leonardoschool.it
```

---

## ❓ Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
pnpm prisma:generate
```

### "Firebase user not found"
Usa `pnpm seed` per creare utenti in Firebase + PostgreSQL

### Database connection error
Verifica che PostgreSQL sia in esecuzione (porta 5433)
```bash
docker-compose up -d
```

### Cookie non settati
Verifica che `NEXT_PUBLIC_APP_URL` corrisponda all'URL effettivo

### Errori TypeScript dopo modifica schema
```bash
pnpm prisma:generate
# Riavvia VS Code/IDE
```

### ESLint errors
```bash
pnpm lint
```

---

## 📄 License

Private - All rights reserved © Leonardo School

---

## 👥 Contatti

- **Email**: info@leonardoschool.it
- **Repository**: github.com/marcimastro98/leonardoschool
