# Logging & Request Tracking

Sistema di logging centralizzato con request tracking simile a Spring Boot (MDC/Sleuth).

## Features

### 1. Request ID Tracking
Ogni richiesta API riceve un UUID univoco che viene tracciato attraverso tutti i log:

```
[12:34:56.789] [req:a1b2c3d4] [VirtualRoom] Heartbeat updated
```

- `12:34:56.789` - Timestamp (HH:mm:ss.SSS)
- `req:a1b2c3d4` - Request ID (primi 8 caratteri dell'UUID)
- `VirtualRoom` - Namespace del modulo

### 2. AsyncLocalStorage (come Spring Boot MDC)
Il request context viene mantenuto attraverso tutte le operazioni async usando `AsyncLocalStorage`, simile al Mapped Diagnostic Context (MDC) di Spring Boot.

### 3. Log Levels
- **debug**: Solo con `LOG_VERBOSE=true` (molto verboso)
- **info**: Solo in development
- **warn**: Sempre loggato
- **error**: Sempre loggato

## Usage

### Creazione Logger

```typescript
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('MyModule');

// Esempi
log.debug('Verbose debug info'); // Solo con LOG_VERBOSE=true
log.info('Informational message'); // Solo in dev
log.warn('Warning message'); // Sempre
log.error('Error occurred:', error); // Sempre
```

### Request Context

Il context è automaticamente disponibile in tutti i tRPC procedures:

```typescript
import { getRequestId, getRequestContext } from '@/lib/utils/requestContext';

// In any tRPC procedure
const requestId = getRequestId(); // UUID della richiesta corrente
const ctx = getRequestContext(); // Full context con userId, path, etc.
```

### Log con Request ID

Quando usi il logger dentro un tRPC procedure, il request ID viene automaticamente incluso:

```typescript
export const myProcedure = protectedProcedure
  .mutation(async ({ ctx, input }) => {
    log.info('Processing request'); 
    // Output: [12:34:56.789] [req:a1b2c3d4] [MyModule] Processing request
    
    // ... operazioni ...
    
    log.info('Request completed');
    // Output: [12:34:58.123] [req:a1b2c3d4] [MyModule] Request completed
  });
```

## Environment Variables

```bash
# Development (default)
NODE_ENV=development  # Logs: error, warn, info

# Abilita log query Prisma
LOG_PRISMA_QUERIES=true

# Abilita log verbose (debug)
LOG_VERBOSE=true

# Production - abilita log info/debug (non raccomandato)
ENABLE_PROD_LOGS=true

# Riduce i log HTTP di Next.js in development (SPERIMENTALE)
# Nota: questa flag può essere deprecata in future versioni di Next.js
NEXT_DISABLE_DEV_LOGGING=true
```

## Ridurre Log HTTP di Next.js in Development

I log come `GET /dashboard 200 in 2.3s` sono **log HTTP di Next.js**, non del nostro logger.

### Soluzioni:

1. **Accettare i log in dev** (raccomandato) - Sono utili per debug e saranno ridotti automaticamente in production

2. **Usare NEXT_DISABLE_DEV_LOGGING** (sperimentale):
   ```bash
   # Nel tuo .env.local
   NEXT_DISABLE_DEV_LOGGING=true
   ```
   ⚠️ **Attenzione**: Questa flag può essere deprecata. Disabilita TUTTI i log di Next.js.

3. **Filtrare visivamente** - Usa strumenti come `grep` per filtrare solo i log del tuo logger:
   ```bash
   # Mostra solo i log del tuo logger (con timestamp e request ID)
   pnpm dev 2>&1 | grep -E "\[[0-9]{2}:[0-9]{2}:[0-9]{2}\]"
   
   # Escludi log Next.js (GET/POST)
   pnpm dev 2>&1 | grep -v "GET\|POST\|PUT\|DELETE"
   ```

### In Production:

I log HTTP di Next.js sono **già molto ridotti** in production:
- Solo richieste con errori (4xx, 5xx)
- Nessun log per richieste statiche
- Tempi di rendering non loggati

## Request ID dal Frontend

Ogni risposta API include l'header `x-request-id` per tracciare la richiesta:

### Nel Browser DevTools (Network tab)
1. Apri DevTools (F12 o Cmd+Option+I su Mac)
2. Vai alla tab **Network**
3. Ricarica la pagina o esegui un'azione che genera chiamate API
4. Clicca su una richiesta API (es. `/api/trpc/auth.me`)
5. Nella sezione **Headers**, scorri fino a **Response Headers**
6. Trovi: `x-request-id: a1b2c3d4-e5f6-7890-abcd-ef1234567890`

**Copia questo ID** e cercalo nei log server per vedere tutti i log correlati a quella richiesta!

### Usarlo nel Codice Client

#### Opzione 1: Hook automatico (Raccomandato)
```typescript
// app/layout.tsx o componente root
import { useRequestTracking } from '@/lib/hooks/useRequestTracking';

export default function RootLayout({ children }) {
  // Logga automaticamente tutti i request ID in console (solo dev)
  useRequestTracking();
  
  return <html>{children}</html>;
}
```

#### Opzione 2: Hook con callback personalizzata
```typescript
import { useRequestTracking } from '@/lib/hooks/useRequestTracking';

function App() {
  useRequestTracking({
    enableLogging: true, // Abilita anche in production
    onRequestId: (requestId, url) => {
      // Invia a servizio di analytics
      analytics.track('api_request', { requestId, url });
    }
  });
  
  return <YourApp />;
}
```

#### Opzione 3: Recupero manuale in caso di errore
```typescript
import { getLastRequestId } from '@/lib/hooks/useRequestTracking';

const mutation = trpc.users.create.useMutation({
  onError: (error) => {
    const requestId = getLastRequestId();
    
    // Mostra all'utente per supporto
    showError(
      `Errore: ${error.message}\n\n` +
      `Per assistenza, fornisci questo ID: ${requestId}`
    );
  },
});
```

## Production Setup

In production:
1. Solo errori e warning vengono loggati di default
2. Usa un log aggregator (Datadog, CloudWatch, etc.) per cercare per request ID
3. Request ID disponibile nel response header `x-request-id`

## Tracing Requests in Production

Quando un utente riporta un errore:

### Dal Frontend:
1. L'utente apre DevTools → Network → trova la richiesta fallita
2. Copia l'header `x-request-id` dalla sezione Response Headers
3. Ti invia il request ID (es. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Dal Backend:
```bash
# Cerca nei log server usando il request ID
grep "req:a1b2c3d4" application.log

# Output: tutti i log correlati a quella richiesta
[12:34:56.789] [req:a1b2c3d4] [Auth] User login attempt
[12:34:57.123] [req:a1b2c3d4] [Database] Query executed
[12:34:58.456] [req:a1b2c3d4] [Error] Authentication failed: Invalid credentials
```

Questo permette di tracciare **end-to-end** una richiesta dal browser ai log del server!

## Comparison con Spring Boot

| Spring Boot | Leonardo School Next.js |
|-------------|------------------------|
| MDC (Mapped Diagnostic Context) | AsyncLocalStorage |
| Request ID Filter | tRPC Context |
| Sleuth/Micrometer | Custom requestContext |
| @Slf4j | createLogger() |
| application.properties log levels | Environment variables |

## Best Practices

1. **Usa sempre il logger invece di console.log**
   ```typescript
   // ❌ Bad
   console.log('User logged in:', userId);
   
   // ✅ Good
   log.info('User logged in', { userId });
   ```

2. **Crea logger con namespace**
   ```typescript
   const log = createLogger('AuthService');
   ```

3. **Log errori con context**
   ```typescript
   try {
     // ... operazioni ...
   } catch (error) {
     log.error('Operation failed:', { userId, operation: 'login', error });
     throw error;
   }
   ```

4. **Usa debug per log molto frequenti**
   ```typescript
   // Heartbeat ogni 3 secondi - usa debug
   log.debug('Heartbeat received', { participantId });
   ```

## Authentication: Cookie vs Bearer Token

Il sistema usa **entrambi** per motivi specifici:

### Bearer Token (Authorization header)
- **Uso**: Chiamate tRPC dal client React
- **Vantaggi**: 
  - Standard per SPA (Single Page Applications)
  - Flessibile per API calls da JavaScript
  - Supporto CORS semplificato

```typescript
// Client tRPC automaticamente aggiunge:
headers: {
  'Authorization': `Bearer ${firebaseToken}`
}
```

### Cookie (auth-token)
- **Uso**: Middleware proxy per SSR e route protection
- **Vantaggi**:
  - HttpOnly (sicuro contro XSS)
  - Automatic inclusion in requests
  - Perfect per middleware Next.js

```typescript
// proxy.ts usa cookie per proteggere pagine SSR
const authToken = request.cookies.get('auth-token')?.value;
```

### Fallback Strategy
Il tRPC context prova **prima Bearer**, poi **Cookie** come fallback:
1. Cerca `Authorization: Bearer <token>`
2. Se non trovato, cerca cookie `auth-token`
3. Questo garantisce compatibilità in tutti gli scenari

## Riduzione Log Noise

### Next.js API Logs
I log tipo `GET /api/trpc/... 200 in 49ms` vengono da Next.js, non dal nostro logger.

Configurazione in `next.config.ts`:
```typescript
logging: {
  fetches: {
    fullUrl: false, // Riduce verbosità
  },
}
```

### Log solo errori in production
- Autenticazione fallita → loggato solo in production
- Query Prisma → mai loggati (a meno che `LOG_PRISMA_QUERIES=true`)
- Heartbeat → solo con `LOG_VERBOSE=true`

## Future Improvements

- [ ] Aggiungere `x-request-id` header nel response
- [ ] Structured JSON logging per production
- [ ] Integration con servizi esterni (Datadog, Sentry)
- [ ] Performance metrics (request duration, etc.)
- [ ] Distributed tracing per microservizi
- [ ] Response time tracking per endpoint
