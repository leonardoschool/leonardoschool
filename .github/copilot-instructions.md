# Leonardo School - Istruzioni per AI Agent

## Panoramica Architettura

Questa è un'applicazione **Next.js 16 (App Router)** per la preparazione ai test universitari, con **architettura ibrida**:
- **Firebase Auth + Storage** per autenticazione e gestione file
- **PostgreSQL + Prisma** per tutti i dati strutturati (domande, simulazioni, risultati, statistiche)
- **tRPC** per layer API type-safe tra frontend e backend

### Pattern Strutturale: Route Groups
L'app usa i route groups di Next.js per separare le funzionalità:
- `app/(marketing)/` - Sito pubblico di marketing (SEO-optimized, con Header/Footer dal layout)
- `app/(app)/` - Area applicazione privata (dashboard studenti/admin, protetta da middleware)
- `app/auth/` - Pagine di autenticazione standalone (layout minimale)

**Homepage** in `app/(marketing)/page.tsx` (re-esporta da `app/_homepage.tsx`)

## Flusso di Autenticazione

### Login e Registrazione
1. **Client** usa helpers di `lib/firebase/auth.ts` (es. `firebaseAuth.login()`, `firebaseAuth.register()`)
2. **Firebase** ritorna JWT token
3. **Client** chiama API `/api/auth/me` (POST) con il token per sincronizzare i dati utente
4. **Server** (`app/api/auth/me/route.ts`) verifica token con Firebase Admin e recupera/crea utente in PostgreSQL
5. **Server** setta cookie HttpOnly sicuri:
   - `auth-token` (HttpOnly, Secure) - Non accessibile da JavaScript
   - `user-role` (non-HttpOnly) - Solo per routing client-side
   - `profile-completed` (non-HttpOnly) - Solo per routing client-side
6. **Client** salva dati non sensibili in localStorage per UI

### Completamento Profilo Obbligatorio
Dopo la registrazione, gli studenti DEVONO compilare il profilo con:
- Codice Fiscale (16 caratteri, uppercase)
- Data di nascita
- Telefono
- Indirizzo completo (via, città, provincia, CAP)

**Workflow:**
1. Registrazione → redirect a `/auth/complete-profile`
2. Submit form → `trpc.students.completeProfile.mutate()` (transazione atomica)
3. Aggiorna `user.profileCompleted = true` in database
4. Redirect a dashboard appropriata (studente/admin)

**Middleware** (`proxy.ts`) blocca accesso a `/app/*` se `profileCompleted = false`

### Attivazione Account
Account studente attivo solo quando:
- `profileCompleted = true` (compilato dal studente)
- `isActive = true` (approvato manualmente da admin via Prisma Studio)

### Logout
- Chiama `firebaseAuth.logout()` che:
  1. Chiama `/api/auth/logout` (POST) per cancellare cookie server-side
  2. Pulisce localStorage
  3. Esegue `signOut()` da Firebase
  4. Redirect a `/auth/login`

### Sicurezza Cookie
✅ **Approccio sicuro implementato:**
- `auth-token`: HttpOnly + Secure → Non leggibile da JS, protetto da XSS
- `user-role`, `profile-completed`: NON HttpOnly, usati SOLO per routing client-side
- **TUTTI** gli endpoint tRPC verificano il token Firebase e leggono i dati reali dal database
- I cookie non-HttpOnly non sono MAI usati per autorizzazione, solo per UX

## Database Schema (Prisma)

File: `prisma/schema.prisma`. Modelli chiave:
- **User** (firebaseUid, role: ADMIN|STUDENT, profileCompleted, isActive, emailVerified)
  - `profileCompleted`: Boolean @default(false) - Studente ha compilato dati anagrafici
  - `isActive`: Boolean @default(false) - Admin ha approvato l'account
- **Student** (fiscalCode, dateOfBirth, phone, address, city, province, postalCode)
- **Admin** (dati amministratore)
- **Question** (subject, difficulty, answers, correctAnswer, imageUrl)
- **Simulation** (configurazione test, timing, regole punteggio)
- **SimulationResult** (risposte studente, punteggi, ranking)
- **StudentStats** (metriche performance aggregate)

**Valori Enum** (importante per filtri/query):
- Subject: `BIOLOGIA`, `CHIMICA`, `FISICA`, `MATEMATICA`, `LOGICA`, `CULTURA_GENERALE`
- UserRole: `ADMIN`, `STUDENT`
- SimulationType: `FULL_TEST`, `SUBJECT_TEST`, `CUSTOM_TEST`, `QUICK_QUIZ`

## Pattern tRPC

Tutta la logica API va in `server/trpc/routers/`. Struttura:
```typescript
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../init';

export const exampleRouter = router({
  publicEndpoint: publicProcedure.query(...),
  userEndpoint: protectedProcedure.query(...),    // Richiede auth
  adminEndpoint: adminProcedure.mutation(...),    // Richiede ruolo ADMIN
});
```

**Aggiungere nuovi router** in `server/trpc/routers/index.ts` (merge in `appRouter`).

**Uso client** (nei componenti):
```typescript
'use client';
import { trpc } from '@/lib/trpc/client';

const { data, isLoading } = trpc.auth.me.useQuery();
const mutation = trpc.students.update.useMutation();
```

## Workflow di Sviluppo

### Setup Database
```bash
pnpm prisma:generate   # Genera Prisma client
pnpm prisma:migrate    # Esegue migrations
pnpm prisma:studio     # Apre DB GUI
```

### Dev Server
```bash
pnpm dev               # Parte su localhost:3000
```

### Variabili d'Ambiente
Copia `.env.example` in `.env.local` e configura:
- Credenziali Firebase (NEXT_PUBLIC_FIREBASE_*)
- Firebase Admin service account (FIREBASE_SERVICE_ACCOUNT_KEY come stringa JSON)
- Connessione PostgreSQL (DATABASE_URL) - porta 5433

## Organizzazione File

### Componenti
- `components/layout/` - Header, Footer, Sidebar (layout condivisi)
- `components/ui/` - Primitive UI riutilizzabili (Button, Card, Input)
- `components/student/` - Funzionalità specifiche studenti
- `components/admin/` - Funzionalità specifiche admin

### Librerie
- `lib/firebase/` - Wrapper Firebase client & admin SDK
- `lib/prisma/` - Prisma client singleton
- `lib/trpc/` - Client tRPC & React Query provider
- `lib/hooks/` - Custom React hooks
- `lib/stores/` - Zustand state management
- `lib/validations/` - Schema Zod per validazione form
- `lib/theme/` - Design system (colori, tipografia, spaziatura)

### Codice Server
- `server/trpc/routers/` - Handler route tRPC (logica business)
- `server/services/` - Layer servizi riutilizzabili (email, calcoli stats, etc.)
- `app/api/` - Route handler Next.js (es. `/api/auth/me`, `/api/auth/logout`)

## Punti di Integrazione Critici

### Upload Firebase Storage
Usa helpers di `lib/firebase/storage.ts`:
```typescript
const { url, path } = await firebaseStorage.uploadQuestionImage(file);
// Salva `url` in PostgreSQL nel campo question.imageUrl
```

### Transazioni Prisma
Per operazioni atomiche (es. submit risultati test):
```typescript
await ctx.prisma.$transaction(async (tx) => {
  await tx.simulationResult.create(...);
  await tx.studentStats.update(...);
});
```

### Controllo Accesso Basato su Ruolo
- Usa `protectedProcedure` per endpoint autenticati
- Usa `adminProcedure` per operazioni solo admin
- Protezione route client-side via `proxy.ts` (convenzione Next.js 16)

### Sistema Colori (IMPORTANTISSIMO)
**USA SEMPRE il sistema colori centralizzato** da `lib/theme/colors.ts` invece di hardcodare valori hex, se non dovesse essere presente il colore desiderato, aggiungilo lì.:

```typescript
import { colors, getSubjectColor } from '@/lib/theme/colors';

// ✅ Corretto - Usa costanti colore
<div className={colors.subjects.matematica.bg} />
<h1 className={colors.primary.gradient} />

// ✅ Colori materia dinamici
<div className={getSubjectColor('BIOLOGIA', 'bg')} />

// ❌ Sbagliato - Non hardcodare valori hex
<div className="bg-[#D54F8A]" />
```

**Categorie colori disponibili:**
- `colors.primary.*` - Colori brand (rosso bordeaux Leonardo School)
- `colors.subjects.*` - Colori specifici materie (matematica, biologia, chimica, fisica, logica, culturaGenerale)
- `colors.neutral.*` - Scala grigi e colori UI neutri
- `colors.background.*` - Sfondi (authPage, card, input, primary, secondary)
- `colors.text.*` - Testi (primary, secondary, muted)
- `colors.border.*` - Bordi
- `colors.effects.*` - Ombre, hover, stati interattivi
- `colors.status.*` - Success, warning, error, info

Vedi `lib/theme/colors.ts` per documentazione completa.

## Linee Guida UI/UX

### Design Responsive
**SEMPRE** creare componenti che si adattano perfettamente a tutti gli schermi:

```typescript
// ✅ Esempio buono - Responsive con breakpoint Tailwind
<div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 xl:gap-8">
    {/* Content */}
  </div>
</div>

// ❌ Evitare - Width fissa o troppo stretta su desktop
<div className="max-w-md mx-auto px-4">
```

**Breakpoint Tailwind:**
- `sm:` 640px - Tablet piccoli
- `md:` 768px - Tablet
- `lg:` 1024px - Desktop
- `xl:` 1280px - Desktop large
- `2xl:` 1536px - Desktop extra large

### Spaziatura e Layout
- **Card/Form**: Usare padding generoso (`px-6 sm:px-10 lg:px-16 xl:px-20`)
- **Gap tra elementi**: `gap-4` mobile, `gap-6` tablet, `gap-8` desktop
- **Sezioni form**: Raggruppare logicamente con titoli e divisori
- **Input**: `py-3` per tocco facile su mobile

### Form Best Practices
```typescript
// ✅ Form ben strutturato
<form className="space-y-6 sm:space-y-8">
  {/* Sezione 1 */}
  <div className="space-y-5">
    <h3 className="text-sm font-semibold uppercase tracking-wide">
      Titolo Sezione
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      <div>
        <label className="block text-sm font-medium mb-2">
          Campo <span className={colors.status.error.text}>*</span>
        </label>
        <input className="block w-full px-4 py-3 rounded-lg..." />
      </div>
    </div>
  </div>
  
  {/* Divisore */}
  <div className={`border-t ${colors.border.primary}`}></div>
  
  {/* Sezione 2 */}
  ...
</form>
```

### Loading States
- Usare spinner animato con `colors.primary.main`
- Mostrare overlay durante operazioni (es. login, submit form)
- Disabilitare bottoni con `disabled:opacity-50 disabled:cursor-not-allowed`

### Dark Mode
- L'app supporta dark mode via Tailwind `media` query
- Usare SEMPRE classi colore da `colors.ts` che gestiscono automaticamente dark mode
- Non usare `bg-white`, `text-black` direttamente

## Testing & Debug

**Non c'è test suite formale.** Workflow testing manuale:
1. Usa `pnpm prisma:studio` per ispezionare/modificare stato DB
2. Controlla tab Network del browser per chiamate tRPC (endpoint: `/api/trpc`)
3. Errori Firebase Auth loggati in console in `server/trpc/context.ts`
4. Per testare flow completo:
   - Registra nuovo utente
   - Verifica redirect a `/auth/complete-profile`
   - Compila form profilo
   - Verifica `profileCompleted = true` in DB
   - Attiva account (`isActive = true`) via Prisma Studio
   - Login e verifica accesso dashboard

## Espansioni Future (Pianificate)

- **App mobile Expo** condividerà router tRPC e tipi Prisma
- **Redis caching** per ranking/statistiche (quando necessario)
- **Background jobs** (BullMQ) per computazioni pesanti
- **Admin panel** per approvazione utenti (attualmente manuale via Prisma Studio)

## Errori Comuni da Evitare

1. **Dimenticare sync Firebase user**: Dopo registrazione Firebase, DEVI chiamare endpoint `/api/auth/me` per creare record DB
2. **Prisma non generato**: Esegui `pnpm prisma:generate` dopo modifiche schema
3. **Token Firebase mancante**: Assicurati `TRPCProvider` wrappa app in `layout.tsx`
4. **Confusione route groups**: Pagine pubbliche in `(marketing)`, private in `(app)`, auth standalone
5. **Hardcodare colori**: USA SEMPRE `lib/theme/colors.ts` invece di valori hex inline (es. `bg-[#D54F8A]`)
6. **Proxy vs Middleware**: Usa `proxy.ts` non `middleware.ts` (convenzione Next.js 16)
7. **Card troppo strette su desktop**: Usa `w-full` con `max-w-6xl` o larghezze percentuali, padding generoso
8. **Form senza responsive**: Testa SEMPRE su mobile, tablet, desktop con DevTools
9. **Cookie non sicuri**: Token auth DEVE essere HttpOnly, altri cookie solo per routing

## Esempi dal Codebase

- **Router tRPC auth**: `server/trpc/routers/auth.ts` (sync Firebase user a DB, get current user)
- **Router tRPC students**: `server/trpc/routers/students.ts` (completeProfile mutation con transaction)
- **Wrapper Firebase auth**: `lib/firebase/auth.ts` (login, register, logout, onAuthStateChanged)
- **API route login**: `app/api/auth/me/route.ts` (POST endpoint per sync user dopo login)
- **API route logout**: `app/api/auth/logout/route.ts` (POST endpoint per clear cookies)
- **Uso Prisma**: `server/trpc/context.ts` (fetch user by firebaseUid)
- **Layout route group**: `app/(marketing)/layout.tsx` (wrappa con Header/Footer)
- **Pagina complete-profile**: `app/auth/complete-profile/page.tsx` (form responsive con validazione)
- **Middleware**: `proxy.ts` (verifica auth, profile completion, role-based access)

## Note Tecniche Aggiuntive

### PostgreSQL
- Porta: 5433
- Credenziali: postgres/postgres
- Database: leonardo_school

### Firebase
- Client SDK configurato in `lib/firebase/config.ts`
- Admin SDK configurato in `lib/firebase/admin.ts`
- Service account key in variabile ambiente `FIREBASE_SERVICE_ACCOUNT_KEY`

### tRPC Context
- Creato in `server/trpc/context.ts`
- Verifica token con `adminAuth.verifyIdToken()`
- Include `prisma`, `user`, `firebaseUid` nel context

### Componente Preloader
- Usato durante caricamento iniziale app
- Supporta dark mode con `colors.background.primary`
- Animazione dots con `colors.primary.main`
