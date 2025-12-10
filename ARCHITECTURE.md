# 🏗️ Architettura Leonardo School

## Decisioni Architetturali

### Perché Next.js App Router?
- ✅ **File-based routing** semplice e intuitivo
- ✅ **Route Groups** per separare marketing da app
- ✅ **Server Components** per performance ottimali
- ✅ **API Routes** integrate per backend logic
- ✅ **Middleware** per protezione route
- ✅ **SEO-friendly** per sito vetrina

### Perché tRPC invece di REST?
- ✅ **Type-safety end-to-end** (nessun API mismatch)
- ✅ **Auto-completion** in IDE
- ✅ **No codegen necessario** (vs GraphQL)
- ✅ **Semplice da usare** con React Query
- ✅ **Migliore DX** per TypeScript monorepo

### Perché Firebase Auth + PostgreSQL?
**Firebase Auth:**
- ✅ Auth enterprise-grade **gratis**
- ✅ OAuth providers integrati
- ✅ Reset password/email verification automatici
- ✅ SDK sicuro e mantenuto
- ✅ No gestione JWT/refresh tokens custom

**PostgreSQL per dati:**
- ✅ Query SQL complesse (JOIN, aggregazioni)
- ✅ Relazioni tra entità (students, questions, results)
- ✅ Transactions ACID
- ✅ Indici performanti per statistiche
- ✅ Portabilità (non vendor lock-in)

### Perché Firebase Storage?
- ✅ Upload diretto da client (no server overhead)
- ✅ Signed URLs automatici
- ✅ CDN globale integrato
- ✅ Compressione automatica immagini
- ✅ Free tier generoso (5GB)

---

## 🔄 Flusso Autenticazione

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. Login (email/password)
       ▼
┌─────────────────┐
│  Firebase Auth  │ ← Gestisce autenticazione
└────────┬────────┘
         │ 2. Restituisce Firebase Token
         ▼
┌─────────────┐
│   Client    │
│  stores     │ ← Salva token in memoria/cookie
└──────┬──────┘
       │ 3. Request API con token in header
       ▼
┌─────────────────┐
│  tRPC Context   │ ← Verifica token Firebase
└────────┬────────┘
         │ 4. Query DB per user metadata
         ▼
┌─────────────────┐
│   PostgreSQL    │ ← User, Student, Admin data
└─────────────────┘
```

---

## 📊 Flusso Dati Test

```
Student inizia simulazione
         ↓
1. GET /api/trpc/simulations.getById
   ← Carica simulazione + domande da PostgreSQL
         ↓
2. Student risponde alle domande
   (state locale React)
         ↓
3. POST /api/trpc/results.submit
   → Salva risultati + calcola score
   → PostgreSQL transaction
         ↓
4. Aggiorna statistiche aggregate
   → StudentStats table
         ↓
5. Calcola ranking real-time
   → Query su SimulationResult
         ↓
6. Ritorna risultato completo
```

---

## 🗂️ Database Design

### User Management
```
User (Firebase UID + metadata)
  ↓
  ├─→ Student (1:1)
  │     └─→ SimulationResults (1:N)
  │
  └─→ Admin (1:1)
```

### Test System
```
Simulation (Test/Esame)
  ↓
  ├─→ SimulationQuestion (M:N via join table)
  │     └─→ Question
  │
  └─→ SimulationResult (1:N)
        └─→ Student
```

### Questions Bank
```
Question
  ├─ subject (enum)
  ├─ difficulty (enum)
  ├─ answers (A, B, C, D, E)
  └─ correctAnswer
```

---

## 🎯 Route Groups Strategy

### `(marketing)` - Pubblico
- SEO ottimizzato
- Server-side rendering
- No autenticazione richiesta
- Layout: Header + Footer

### `(app)` - Privato
- Protected routes (middleware)
- Client-heavy (dashboard, forms)
- Layout: Sidebar + App Header
- No SEO needed

### `auth` - Standalone
- Layout minimale
- No header/footer
- No sidebar

---

## 🔒 Security Layers

### 1. Firebase Auth (Client → Firebase)
- Password hashing sicuro
- Rate limiting automatico
- Protezione brute-force

### 2. Middleware Next.js (Route Protection)
```typescript
if (pathname.startsWith('/app')) {
  verificaToken() || redirect('/auth/login')
}
```

### 3. tRPC Context (API Protection)
```typescript
if (!ctx.user) throw TRPCError('UNAUTHORIZED')
if (ctx.user.role !== 'ADMIN') throw TRPCError('FORBIDDEN')
```

### 4. Database (Row-Level Security via Prisma)
```typescript
// Student può vedere solo i SUOI risultati
prisma.simulationResult.findMany({
  where: { studentId: ctx.user.student.id }
})
```

---

## 📈 Scalabilità Futura

### Redis Cache (quando necessario)
```typescript
// Cache classifica per 5 minuti
const ranking = await redis.get(`ranking:${simulationId}`)
if (!ranking) {
  const fresh = await computeRanking()
  await redis.setex(`ranking:${simulationId}`, 300, fresh)
}
```

### Background Jobs (BullMQ)
```typescript
// Calcolo statistiche pesanti in background
await statsQueue.add('compute-stats', {
  studentId: '...',
  dateRange: '...'
})
```

### CDN per Asset Statici
- Cloudflare per PDF/immagini
- Next.js Image Optimization built-in

---

## 🧪 Testing Strategy

### Unit Tests (Future)
- `vitest` per utils/helpers
- `@testing-library/react` per componenti

### E2E Tests (Future)
- `Playwright` per flussi critici:
  - Login/Registrazione
  - Esecuzione test
  - Visualizzazione risultati

### Database Tests
- `Prisma` con test database separato

---

## 🚀 Deploy Strategy

### Frontend (Vercel)
- Auto-deploy da `main` branch
- Edge Functions per API Routes
- ISR per pagine marketing

### Database (Neon/Railway)
- PostgreSQL managed
- Backup automatici
- Connection pooling

### Storage (Firebase)
- CDN globale
- Auto-scaling

### Monitoring
- Vercel Analytics (già integrato)
- Sentry per error tracking (future)
- PostHog per product analytics (future)

---

## 🔮 Roadmap Tecnico

### Phase 1 (Attuale)
- [x] Riorganizzazione struttura
- [ ] Setup Firebase Auth
- [ ] Setup Prisma + PostgreSQL
- [ ] Setup tRPC
- [ ] Area autenticazione
- [ ] Dashboard studente base

### Phase 2
- [ ] Dashboard admin completa
- [ ] Editor domande
- [ ] Simulazioni builder
- [ ] Sistema ranking
- [ ] Statistiche avanzate

### Phase 3
- [ ] Expo mobile app
- [ ] Push notifications
- [ ] Offline mode
- [ ] Real-time collaboration

### Phase 4
- [ ] Redis caching
- [ ] Background jobs
- [ ] Advanced analytics
- [ ] A/B testing system
