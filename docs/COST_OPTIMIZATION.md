# Cost Optimization & Scalability Strategy
## Leonardo School - Piano Completo di Ottimizzazione

**Data:** 28 Gennaio 2026  
**Versione:** 1.0  
**Stato:** Fase 1 Completata ✅

---

## 📊 Executive Summary

Questo documento fornisce una strategia completa per ottimizzare i costi di Leonardo School su **Neon PostgreSQL** e **Vercel**, mantenendo un'esperienza utente eccellente e scalabilità fino a **500+ studenti**.

### Risultati Attesi
- **Fase 1 (Completata):** -70% invocazioni serverless
- **Fase 2 (FCM):** -80% invocazioni aggiuntive  
- **Fase 3 (SSE studenti):** -90% polling critico
- **Fase 4 (Cleanup):** -50% storage database
- **Costo finale stimato:** $20-40/mese per 100 studenti, $60-100/mese per 500 studenti

---

## 🎯 Situazione Attuale

### Stack Tecnologico
```
Frontend: Next.js 16 (App Router) + React + TailwindCSS
Backend: tRPC + Prisma ORM
Database: Neon PostgreSQL (Free tier → Launch/Scale tier)
Hosting: Vercel (Hobby → Pro tier)
Auth: Firebase Auth
Storage: Firebase Storage
Mobile: React Native (Expo)
```

### Piano Prezzi Attuale
#### Neon PostgreSQL
- **Free tier:** 0.5GB storage, 100 compute hours/mese - ATTUALE
- **Launch ($19/mese):** 10GB storage, 300 compute hours - per 100+ studenti
- **Scale ($69/mese):** 50GB storage, 750 compute hours - per 500+ studenti

#### Vercel
- **Hobby (free):** 100GB bandwidth, 100 cron jobs - ATTUALE
- **Pro ($20/mese):** 1TB bandwidth, 1000 cron jobs, **3M serverless invocations** - NECESSARIO per produzione

---

## ✅ FASE 1: Ottimizzazioni Implementate

### 1.1 Focus Detection Hook
**File:** `/lib/hooks/useWindowFocus.ts`

```typescript
/**
 * Hook che ferma COMPLETAMENTE il polling quando:
 * - L'utente cambia tab
 * - Minimizza la finestra del browser
 * - Il browser va in background (mobile)
 */
export function useFocusAwarePolling(
  intervalMs: number, 
  enabled: boolean
): number | false {
  const isFocused = useWindowFocus();
  return enabled && isFocused ? intervalMs : false;
}
```

**Impatto:** ~70% riduzione invocazioni (scenario medio: utente lascia tab aperto ma non attivo)

### 1.2 Intervalli Polling Ottimizzati

| Componente | Prima | Dopo | Query/giorno (1 utente attivo 8h) |
|------------|-------|------|-----------------------------------|
| **AppHeader** | 60s | 120s + focus | 480 → 144 queries (-70%) |
| **MessagesPageContent** | 15s | 30s + focus | 1920 → 576 queries (-70%) |
| **InTestMessaging** | 2s | 3s + focus | 14400 → 4800 queries (-67%) |
| **StudentWaitingRoom** | 3s | 5s + focus | 9600 → 2880 queries (-70%) |
| **AdminSimulations badge** | 60s | 120s + focus | 480 → 144 queries (-70%) |
| **Mobile conversations** | 15s | 30s | 1920 → 960 queries (-50%) |

### 1.3 Calcolo Risparmio Effettivo

**Scenario: 100 studenti, 20 collaboratori, 5 admin**

**Prima delle ottimizzazioni:**
```
AppHeader (sempre attivo):
- 125 utenti × 480 queries/giorno = 60.000 queries/giorno
- 60.000 × 30 giorni = 1.800.000 queries/mese

Messaggi (50% utenti, 2h/giorno):
- 62 utenti × 480 queries/giorno = 29.760 queries/giorno  
- 29.760 × 30 = 892.800 queries/mese

Virtual Room (10 sessioni/giorno, 30min ciascuna):
- 10 × 10 studenti × 1800 queries = 180.000 queries/giorno
- 180.000 × 30 = 5.400.000 queries/mese

TOTALE: ~8.100.000 queries/mese
```

**Dopo Fase 1 (focus detection):**
```
AppHeader: 1.800.000 × 0.3 = 540.000 queries/mese
Messaggi: 892.800 × 0.3 = 267.840 queries/mese  
Virtual Room: 5.400.000 (invariato - studenti in test attivo)

TOTALE: ~6.200.000 queries/mese (-23% totale)
```

**Vercel Pro:** 3.000.000 invocazioni/mese → INSUFFICIENTE

**⚠️ SERVE FASE 2 (FCM) per scendere sotto i 3M**

---

## 🚀 FASE 2: Firebase Cloud Messaging (CRITICO)

### 2.1 Obiettivo
Eliminare COMPLETAMENTE il polling per notifiche e messaggi, sostituendolo con **push notifications**.

### 2.2 Architettura FCM

```
┌─────────────────┐
│   Client Web    │
│  (React App)    │
└────────┬────────┘
         │ 1. Richiede FCM token
         ↓
┌─────────────────┐
│ Firebase SDK    │
│ (FCM Client)    │
└────────┬────────┘
         │ 2. Genera token
         │
         ↓
┌─────────────────┐        4. Evento DB        ┌─────────────────┐
│   PostgreSQL    │──────(nuovo messaggio)────→│  tRPC Server    │
│   (Prisma)      │                             │  (Next.js API)  │
└─────────────────┘                             └────────┬────────┘
         ↑                                               │
         │ 3. Salva token                                │
         │    in user.fcmToken                           │ 5. Invia push
         │                                               ↓
         │                                      ┌─────────────────┐
         └──────────────────────────────────────│ Firebase Admin  │
                                                 │  FCM Service    │
                                                 └────────┬────────┘
                                                          │ 6. Notifica push
                                                          ↓
                                                 ┌─────────────────┐
                                                 │   Client Web    │
                                                 │ (anche chiuso)  │
                                                 └─────────────────┘
```

### 2.3 Implementazione Completa

#### Step 1: Aggiornare Prisma Schema
```prisma
// prisma/schema.prisma

model User {
  // ... campi esistenti
  
  // FCM tokens per notifiche push (multi-device support)
  fcmTokens          FCMToken[]
}

model FCMToken {
  id          String   @id @default(cuid())
  token       String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceInfo  String?  // User agent per identificare device
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastUsedAt  DateTime @default(now())
  isActive    Boolean  @default(true)
  
  @@index([userId])
  @@index([token])
}
```

#### Step 2: Setup Firebase Client SDK
```typescript
// lib/firebase/messaging.ts

import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { firebaseApp } from './config';

let messaging: Messaging | null = null;

export async function initializeMessaging() {
  if (typeof window === 'undefined') return null;
  
  try {
    messaging = getMessaging(firebaseApp);
    return messaging;
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return null;
  }
}

/**
 * Richiede permessi e genera FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    const msg = await initializeMessaging();
    if (!msg) return null;

    // VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
    const token = await getToken(msg, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Setup listener per messaggi in foreground
 */
export function setupForegroundMessageListener(
  onMessageReceived: (payload: any) => void
) {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('[FCM] Message received:', payload);
    onMessageReceived(payload);
  });
}
```

#### Step 3: Service Worker per Background Notifications
```javascript
// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  projectId: "YOUR_PROJECT_ID",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
});

const messaging = firebase.messaging();

// Background notification handler
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'Leonardo School';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/images/logo-square.png',
    badge: '/images/badge-icon.png',
    data: payload.data,
    tag: payload.data?.notificationId, // Previene duplicati
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click notification handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/dashboard';
  
  if (data?.type === 'NEW_MESSAGE') {
    url = `/messaggi?conversation=${data.conversationId}`;
  } else if (data?.type === 'NOTIFICATION') {
    url = `/notifiche`;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

#### Step 4: Server-Side FCM Service
```typescript
// server/services/fcmService.ts

import { getMessaging } from 'firebase-admin/messaging';
import { prisma } from '@/lib/prisma/client';

interface FCMNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
}

interface FCMDataPayload {
  type: 'NEW_MESSAGE' | 'NOTIFICATION' | 'SIMULATION_STARTED' | 'SIMULATION_ENDED';
  [key: string]: string;
}

/**
 * Invia notifica push a un utente (tutti i suoi device)
 */
export async function sendPushNotificationToUser(
  userId: string,
  notification: FCMNotificationPayload,
  data: FCMDataPayload,
  options?: {
    silent?: boolean; // Silent = aggiorna UI senza mostrare notifica
    priority?: 'high' | 'normal';
  }
) {
  try {
    // Recupera tutti i token FCM attivi dell'utente
    const fcmTokens = await prisma.fCMToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        token: true,
        id: true,
      },
    });

    if (fcmTokens.length === 0) {
      console.log(`[FCM] No active tokens for user ${userId}`);
      return { success: false, reason: 'no_tokens' };
    }

    const messaging = getMessaging();
    const tokens = fcmTokens.map(t => t.token);

    // Invia a tutti i device dell'utente
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: options?.silent ? undefined : {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: data as Record<string, string>,
      webpush: {
        notification: {
          icon: '/images/logo-square.png',
          badge: '/images/badge-icon.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: data.type === 'NEW_MESSAGE' 
            ? `/messaggi?conversation=${data.conversationId || ''}`
            : '/notifiche',
        },
      },
      android: {
        priority: options?.priority || 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    // Disattiva token non validi
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          // Token non validi da rimuovere
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await prisma.fCMToken.updateMany({
          where: {
            token: { in: failedTokens },
          },
          data: {
            isActive: false,
          },
        });
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('[FCM] Error sending notification:', error);
    return { success: false, error };
  }
}

/**
 * Invia notifica push a più utenti
 */
export async function sendPushNotificationToUsers(
  userIds: string[],
  notification: FCMNotificationPayload,
  data: FCMDataPayload,
  options?: {
    silent?: boolean;
    priority?: 'high' | 'normal';
  }
) {
  const results = await Promise.allSettled(
    userIds.map(userId => 
      sendPushNotificationToUser(userId, notification, data, options)
    )
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  return {
    total: userIds.length,
    successful,
    failed: userIds.length - successful,
  };
}
```

#### Step 5: tRPC Router per Token Management
```typescript
// server/trpc/routers/fcm.ts

import { z } from 'zod';
import { protectedProcedure, router } from '../init';

export const fcmRouter = router({
  /**
   * Registra/aggiorna FCM token per l'utente corrente
   */
  registerToken: protectedProcedure
    .input(z.object({
      token: z.string(),
      deviceInfo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { user, prisma } = ctx;

      // Controlla se il token esiste già
      const existing = await prisma.fCMToken.findUnique({
        where: { token: input.token },
      });

      if (existing) {
        // Aggiorna lastUsedAt
        await prisma.fCMToken.update({
          where: { token: input.token },
          data: {
            lastUsedAt: new Date(),
            isActive: true,
            deviceInfo: input.deviceInfo,
          },
        });
        return { success: true, existing: true };
      }

      // Crea nuovo token
      await prisma.fCMToken.create({
        data: {
          token: input.token,
          userId: user.id,
          deviceInfo: input.deviceInfo,
        },
      });

      return { success: true, existing: false };
    }),

  /**
   * Disattiva token quando l'utente fa logout o nega permessi
   */
  unregisterToken: protectedProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.fCMToken.updateMany({
        where: {
          token: input.token,
          userId: ctx.user.id,
        },
        data: {
          isActive: false,
        },
      });

      return { success: true };
    }),

  /**
   * Test notifica (dev only)
   */
  sendTestNotification: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { sendPushNotificationToUser } = await import('@/server/services/fcmService');
      
      const result = await sendPushNotificationToUser(
        ctx.user.id,
        {
          title: '🧪 Test Notifica',
          body: 'Questa è una notifica di test da Leonardo School!',
        },
        {
          type: 'NOTIFICATION',
          testData: 'true',
        }
      );

      return result;
    }),
});
```

Aggiungi a `server/trpc/routers/index.ts`:
```typescript
import { fcmRouter } from './fcm';

export const appRouter = router({
  // ... router esistenti
  fcm: fcmRouter,
});
```

#### Step 6: Hook React per FCM Registration
```typescript
// lib/hooks/useFCMNotifications.ts

import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { 
  requestNotificationPermission, 
  setupForegroundMessageListener 
} from '@/lib/firebase/messaging';

export function useFCMNotifications() {
  const [permissionGranted, setPermissionGranted] = useState(false);
  const utils = trpc.useUtils();

  const registerTokenMutation = trpc.fcm.registerToken.useMutation();

  useEffect(() => {
    const setupFCM = async () => {
      // Richiedi permessi e token
      const token = await requestNotificationPermission();
      if (!token) {
        console.log('[FCM] No token received');
        return;
      }

      setPermissionGranted(true);

      // Salva token nel database
      const deviceInfo = navigator.userAgent;
      await registerTokenMutation.mutateAsync({ token, deviceInfo });

      // Setup listener per messaggi in foreground
      setupForegroundMessageListener((payload) => {
        console.log('[FCM] Foreground message:', payload);

        // Invalida query React Query appropriate
        if (payload.data?.type === 'NEW_MESSAGE') {
          utils.messages.getConversations.invalidate();
          utils.messages.getUnreadCount.invalidate();
        } else if (payload.data?.type === 'NOTIFICATION') {
          utils.notifications.getNotifications.invalidate();
        }

        // Mostra notifica browser anche in foreground (opzionale)
        if (Notification.permission === 'granted' && payload.notification) {
          new Notification(payload.notification.title || 'Leonardo School', {
            body: payload.notification.body || '',
            icon: '/images/logo-square.png',
          });
        }
      });
    };

    setupFCM();
  }, []);

  return { permissionGranted };
}
```

#### Step 7: Integra FCM in AppHeader
```typescript
// components/layout/AppHeader.tsx

import { useFCMNotifications } from '@/lib/hooks/useFCMNotifications';

export default function AppHeader() {
  // ... codice esistente

  // Setup FCM (sostituisce il polling in futuro)
  useFCMNotifications();

  // RIMUOVI polling per notifiche dopo che FCM è attivo:
  // const { data: notificationsData } = trpc.notifications.getNotifications.useQuery(...)
  // SOSTITUISCI con fetch singolo + invalidazione via FCM
  
  const { data: notificationsData } = trpc.notifications.getNotifications.useQuery(
    { unreadOnly: true, pageSize: 10 },
    { 
      enabled: !!user,
      // ❌ RIMUOVI: refetchInterval: focusAwarePollingInterval,
      // ✅ FCM invalida automaticamente questa query
    }
  );

  // ... resto del codice
}
```

#### Step 8: Trigger FCM da Server (Esempi)

**Nuovo messaggio:**
```typescript
// server/trpc/routers/messages.ts

export const messagesRouter = router({
  sendMessage: protectedProcedure
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      // ... crea messaggio in DB

      // Invia FCM push al destinatario
      const { sendPushNotificationToUser } = await import('@/server/services/fcmService');
      
      await sendPushNotificationToUser(
        recipientUserId,
        {
          title: `Nuovo messaggio da ${ctx.user.profile?.nome} ${ctx.user.profile?.cognome}`,
          body: input.message.substring(0, 100),
        },
        {
          type: 'NEW_MESSAGE',
          conversationId: conversation.id,
          senderId: ctx.user.id,
        },
        {
          priority: 'high',
        }
      );

      return message;
    }),
});
```

**Nuova notifica:**
```typescript
// server/services/notificationService.ts

export async function createNotification(data: NotificationData) {
  const notification = await prisma.notification.create({ data });

  // Invia FCM push
  const { sendPushNotificationToUser } = await import('./fcmService');
  
  await sendPushNotificationToUser(
    data.userId,
    {
      title: getNotificationTitle(data.type),
      body: data.message || '',
    },
    {
      type: 'NOTIFICATION',
      notificationId: notification.id,
      notificationType: data.type,
    }
  );

  return notification;
}
```

### 2.4 Risultati Attesi Fase 2

**Con FCM attivo:**
```
AppHeader: 540.000 → ~100 queries/mese (solo fetch iniziale)
Messaggi: 267.840 → ~100 queries/mese (solo fetch iniziale)

TOTALE: 6.200.000 → 5.400.100 queries/mese (-13% aggiuntivo)
```

**Ma soprattutto:** AppHeader NON fa più polling = esperienza molto più fluida

**⚠️ Virtual Room rimane il bottleneck:** 5.4M queries/mese → SERVE FASE 3

---

## 🎮 FASE 3: Virtual Room SSE per Studenti

### 3.1 Problema Attuale
Studente durante test: **polling 1s** per controllare stato sessione (espulso, test finito, etc.)

**Calcolo:**
- 10 sessioni/giorno
- 10 studenti per sessione  
- 30 minuti di durata media
- 1 query/secondo

= 10 × 10 × 1800 = **180.000 queries/giorno** = **5.400.000 queries/mese**

### 3.2 Soluzione: Estendi SSE anche agli studenti

**Admin già usa SSE** (`lib/hooks/useVirtualRoomSSE.ts`) - estendilo agli studenti.

#### Step 1: Aggiorna SSE Hook
```typescript
// lib/hooks/useVirtualRoomSSE.ts

export function useVirtualRoomSSE(
  sessionId: string | null,
  role: 'ADMIN' | 'STUDENT' // ✅ Aggiungi supporto studente
) {
  const [data, setData] = useState<VirtualRoomData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Crea connessione SSE (per admin e studenti)
    const eventSource = new EventSource(
      `/api/virtual-room/${sessionId}/sse?role=${role}`
    );

    eventSource.onopen = () => {
      console.log(`[SSE ${role}] Connected to session ${sessionId}`);
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      console.log(`[SSE ${role}] Update:`, update);

      if (role === 'ADMIN') {
        // Admin riceve dati completi sessione
        setData(update);
      } else {
        // Studente riceve solo eventi rilevanti
        handleStudentEvent(update);
      }
    };

    // Eventi custom per studenti
    eventSource.addEventListener('kicked', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('[SSE STUDENT] Kicked:', data);
      window.location.href = '/simulazioni?kicked=true';
    });

    eventSource.addEventListener('session_ended', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('[SSE STUDENT] Session ended:', data);
      window.location.href = `/simulazioni/${data.assignmentId}/risultato`;
    });

    eventSource.addEventListener('new_message', (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('[SSE STUDENT] New message:', data);
      // Invalida query messaggi
      queryClient.invalidateQueries(['virtualRoom', 'messages']);
    });

    eventSource.onerror = () => {
      console.error(`[SSE ${role}] Connection error`);
      setIsConnected(false);
    };

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [sessionId, role]);

  return { data, isConnected, reconnect: () => {} };
}
```

#### Step 2: Aggiorna API SSE per Supportare Studenti
```typescript
// app/api/virtual-room/[sessionId]/sse/route.ts

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role') as 'ADMIN' | 'STUDENT';
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Setup heartbeat
      const heartbeatInterval = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30000);

      try {
        if (role === 'ADMIN') {
          // Admin: invia stato completo sessione ogni 2s
          const updateInterval = setInterval(async () => {
            const data = await getFullSessionData(params.sessionId);
            const message = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          }, 2000);

          // Cleanup
          request.signal.addEventListener('abort', () => {
            clearInterval(updateInterval);
            clearInterval(heartbeatInterval);
            controller.close();
          });
        } else {
          // STUDENT: invia solo eventi rilevanti (niente polling continuo)
          
          // Event listener su database per eventi studente
          const studentEventsInterval = setInterval(async () => {
            // Controlla solo se ci sono eventi per questo studente
            const events = await checkStudentEvents(params.sessionId, request.headers.get('x-user-id'));
            
            if (events.kicked) {
              controller.enqueue(encoder.encode(
                `event: kicked\ndata: ${JSON.stringify(events.kicked)}\n\n`
              ));
            }
            
            if (events.sessionEnded) {
              controller.enqueue(encoder.encode(
                `event: session_ended\ndata: ${JSON.stringify(events.sessionEnded)}\n\n`
              ));
            }
            
            if (events.newMessages) {
              controller.enqueue(encoder.encode(
                `event: new_message\ndata: ${JSON.stringify(events.newMessages)}\n\n`
              ));
            }
          }, 5000); // Check eventi solo ogni 5s invece di 1s

          // Cleanup
          request.signal.addEventListener('abort', () => {
            clearInterval(studentEventsInterval);
            clearInterval(heartbeatInterval);
            controller.close();
          });
        }
      } catch (error) {
        console.error('[SSE] Error:', error);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function checkStudentEvents(sessionId: string, userId: string | null) {
  if (!userId) return {};

  const participant = await prisma.simulationParticipant.findFirst({
    where: {
      sessionId,
      studentId: userId,
    },
    include: {
      session: true,
    },
  });

  if (!participant) return {};

  return {
    kicked: participant.isKicked ? {
      reason: participant.kickedReason,
      timestamp: participant.kickedAt,
    } : null,
    sessionEnded: participant.session.status === 'COMPLETED' ? {
      assignmentId: participant.session.assignmentId,
    } : null,
    // newMessages: controllato da FCM in futuro
  };
}
```

#### Step 3: Usa SSE in Virtual Room Studente
```typescript
// app/virtual-room/[id]/page.tsx

export default function VirtualRoomPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'COLLABORATOR';

  // SSE per TUTTI (admin e studenti)
  const { data: sseData, isConnected: sseConnected, reconnect: sseReconnect } = useVirtualRoomSSE(
    sessionId,
    isStudent ? 'STUDENT' : 'ADMIN'
  );

  // ❌ RIMUOVI polling per studenti:
  // const studentStatus = trpc.virtualRoom.getStudentSessionStatus.useQuery(...)

  // ✅ Studente riceve eventi via SSE - zero polling!

  return (
    // ... UI
  );
}
```

### 3.3 Risultati Attesi Fase 3

**Con SSE per studenti:**
```
Virtual Room studenti: 5.400.000 → ~100.000 queries/mese
(Solo query iniziali + eventi puntuali, niente polling continuo)

TOTALE: 5.400.100 → ~100.200 queries/mese (-98% rispetto a prima!)
```

**Vercel Pro:** 3.000.000 invocazioni/mese → ✅ AMPIAMENTE SUFFICIENTE

---

## 🗄️ FASE 4: Database Cleanup & Storage Optimization

### 4.1 Cleanup Service Esistente
**File:** `/server/services/cleanupService.ts`

Già implementato cleanup per 13 tabelle. Eseguito da cron giornaliero alle 3:00.

### 4.2 Politiche di Retention Raccomandate

```typescript
// server/services/cleanupService.ts - CONFIGURAZIONE OTTIMIZZATA

const RETENTION_POLICIES = {
  // Logs e eventi temporanei
  sessionCheatingEvents: 90,     // 3 mesi
  sessionMessages: 180,          // 6 mesi
  simulationSessions: 365,       // 1 anno
  
  // Calendario e presenze
  calendarEvents: 730,           // 2 anni (storico importante)
  staffAbsences: 730,            // 2 anni
  studentAbsences: 730,          // 2 anni (registro legale)
  
  // Audit e tracciamento
  auditLogs: 365,                // 1 anno
  loginAttempts: 90,             // 3 mesi
  
  // Notifiche e messaggi
  notifications: 90,             // 3 mesi (dopo sono irrilevanti)
  conversations: 'never',        // Mai cancellare (serve storico)
  messages: 730,                 // 2 anni (messaggi molto vecchi)
  
  // Contratti e documenti (CONSERVARE SEMPRE per ragioni legali)
  contracts: 'never',
  jobApplications: 1825,         // 5 anni
  contactRequests: 365,          // 1 anno
  
  // File e media
  firebaseFiles: 'manual',       // Cleanup manuale via Cloud Functions
  
  // Simulazioni e risultati (valore educativo)
  simulationAttempts: 730,       // 2 anni
  simulationResults: 'never',    // Mai cancellare (portfolio studenti)
};
```

### 4.3 Ottimizzazione Indici Database

```sql
-- prisma/migrations/add_performance_indexes.sql

-- Cleanup queries optimization
CREATE INDEX idx_session_cheating_events_created_at ON "SessionCheatingEvent"("createdAt");
CREATE INDEX idx_session_messages_created_at ON "SessionMessage"("createdAt");
CREATE INDEX idx_calendar_events_date ON "CalendarEvent"("date");

-- Query più frequenti
CREATE INDEX idx_notifications_user_read ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX idx_messages_conversation_created ON "Message"("conversationId", "createdAt");
CREATE INDEX idx_simulation_sessions_status ON "SimulationSession"("status", "createdAt");

-- Composite index per dashboard queries
CREATE INDEX idx_contracts_status_dates ON "Contract"("status", "startDate", "endDate");
CREATE INDEX idx_absences_student_date ON "StudentAbsence"("studentId", "date");
```

### 4.4 Archiving Strategy (Opzionale per 500+ studenti)

Per dati che non possono essere cancellati ma raramente consultati:

```typescript
// server/services/archiveService.ts

/**
 * Sposta dati vecchi su storage più economico (S3/Firebase Storage)
 * mantenendo referenze in PostgreSQL
 */
export async function archiveOldData() {
  // 1. Archivia simulationAttempts > 2 anni
  const oldAttempts = await prisma.simulationAttempt.findMany({
    where: {
      completedAt: {
        lt: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000), // 2 anni
      },
    },
    include: {
      result: true,
    },
  });

  for (const attempt of oldAttempts) {
    // Salva JSON su Firebase Storage
    const archiveData = {
      attempt,
      archivedAt: new Date(),
    };
    
    const filePath = `archives/attempts/${attempt.id}.json`;
    await uploadToFirebase(filePath, JSON.stringify(archiveData));
    
    // Aggiorna record per indicare archiviazione
    await prisma.simulationAttempt.update({
      where: { id: attempt.id },
      data: {
        isArchived: true,
        archiveUrl: filePath,
        // Mantieni solo metadata essenziale
        answers: null,
      },
    });
  }
  
  // 2. Archivia messaggi > 2 anni
  // 3. Archivia file upload vecchi
  // ... etc
}
```

### 4.5 Monitoring Storage Usage

```typescript
// server/trpc/routers/admin.ts

export const adminRouter = router({
  getDatabaseStats: adminProcedure
    .query(async ({ ctx }) => {
      // Query PostgreSQL per dimensioni tabelle
      const tablesSizes = await ctx.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC;
      `;

      return {
        tables: tablesSizes,
        // Aggiungi altri metrics
      };
    }),
});
```

---

## 📈 FASE 5: Caching Avanzato

### 5.1 Già Implementato
```typescript
// lib/cache/createCachedQuery.ts

const CACHE_TTL = {
  SHORT: 60,      // 1 minuto
  MEDIUM: 300,    // 5 minuti  
  LONG: 900,      // 15 minuti
};
```

### 5.2 Espandi Caching per Query Costose

```typescript
// server/trpc/routers/simulations.ts

export const simulationsRouter = router({
  getSimulations: protectedProcedure
    .input(getSimulationsSchema)
    .query(async ({ ctx, input }) => {
      // Usa cache per liste che cambiano raramente
      return await createCachedQuery({
        key: `simulations:list:${JSON.stringify(input)}`,
        ttl: CACHE_TTL.MEDIUM, // 5 minuti
        queryFn: () => fetchSimulationsFromDB(input),
      });
    }),

  getSimulationStats: adminProcedure
    .query(async ({ ctx }) => {
      // Stats dashboard - cache aggressivo
      return await createCachedQuery({
        key: 'simulations:stats:global',
        ttl: CACHE_TTL.LONG, // 15 minuti
        queryFn: () => calculateSimulationStats(),
      });
    }),
});
```

### 5.3 Redis per Produzione (Opzionale)

Per 500+ studenti, considera **Upstash Redis** (serverless):

```typescript
// lib/cache/redis.ts

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export async function getCached<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  return cached as T | null;
}

export async function setCache(key: string, value: any, ttlSeconds: number) {
  await redis.setex(key, ttlSeconds, value);
}

export async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**Costo Upstash:** Free tier 10k commands/day, Pro $10/mese per 100k/day.

---

## 🎯 ROADMAP COMPLETA DI IMPLEMENTAZIONE

### Timeline Raccomandata

#### **Sprint 1 (1-2 settimane): FCM Setup Base**
- [ ] Setup Firebase Cloud Messaging nel progetto
- [ ] Aggiorna Prisma schema con `FCMToken`
- [ ] Implementa client SDK (`lib/firebase/messaging.ts`)
- [ ] Crea service worker (`public/firebase-messaging-sw.js`)
- [ ] Implementa server service (`server/services/fcmService.ts`)
- [ ] Test su dev environment

**Output:** FCM funzionante, pronto per integrazione

#### **Sprint 2 (1 settimana): FCM per Notifiche**
- [ ] Integra `useFCMNotifications` in AppHeader
- [ ] Rimuovi polling notifiche da AppHeader
- [ ] Integra FCM in `notificationService.ts`
- [ ] Test con utenti reali
- [ ] Monitoring e logging

**Output:** Notifiche istantanee, -70% queries AppHeader

#### **Sprint 3 (1 settimana): FCM per Messaggi**
- [ ] Integra FCM in `messagesRouter`
- [ ] Rimuovi polling messaggi da `MessagesPageContent`
- [ ] Test invio/ricezione messaggi
- [ ] Gestisci edge cases (multi-device, offline)

**Output:** Messaggi istantanei, -70% queries Messaggi

#### **Sprint 4 (1-2 settimane): SSE per Studenti Virtual Room**
- [ ] Estendi `useVirtualRoomSSE` per studenti
- [ ] Aggiorna API SSE (`/api/virtual-room/[id]/sse`)
- [ ] Implementa eventi studente (kicked, session_ended)
- [ ] Rimuovi polling da `VirtualRoomPage` studente
- [ ] Test stress (10+ studenti simultanei)

**Output:** Virtual Room completamente real-time, -98% queries

#### **Sprint 5 (1 settimana): Database Optimization**
- [ ] Rivedi retention policies in `cleanupService.ts`
- [ ] Aggiungi indici database performance-critical
- [ ] Implementa monitoring storage (`getDatabaseStats`)
- [ ] Documenta politiche retention per team

**Output:** Database ottimizzato, storage ridotto -50%

#### **Sprint 6 (opzionale): Caching & Scaling**
- [ ] Setup Upstash Redis (se necessario)
- [ ] Implementa caching avanzato per query costose
- [ ] Monitoring performance Neon
- [ ] Load testing con 100+ utenti simultanei

**Output:** Sistema pronto per 500+ studenti

---

## 💰 ANALISI COSTI DETTAGLIATA

### Scenario 1: 100 Studenti + 20 Collaboratori + 5 Admin

#### **Dopo Fase 1 (Attuale)**
```
Vercel Pro: $20/mese
  - 6.2M invocazioni/mese
  - ⚠️ Supera limite 3M → serve upgrade o Fase 2

Neon PostgreSQL Free: $0
  - 0.3GB storage stimato
  - 80 compute hours/mese
  - ✅ Sufficiente

Firebase (Auth + Storage): $5-10/mese
  - 125 utenti attivi
  - ~5GB storage file/mese
  
TOTALE: $25-30/mese ⚠️ (richiede Fase 2 per evitare extra fees)
```

#### **Dopo Fase 2 + 3 (FCM + SSE)**
```
Vercel Pro: $20/mese
  - 100k invocazioni/mese
  - ✅ Molto sotto limite 3M

Neon PostgreSQL Free: $0
  - 0.3GB storage
  - 60 compute hours/mese (ridotto grazie a meno queries)
  - ✅ Sufficiente

Firebase (Auth + Storage + FCM): $8-15/mese
  - FCM free fino a 1M notifiche/mese
  - Storage ~5GB
  
TOTALE: $28-35/mese ✅
```

### Scenario 2: 500 Studenti + 50 Collaboratori + 10 Admin

#### **Dopo Fase 1 (Polling Ottimizzato)**
```
Vercel Pro: $20/mese
  - ~30M invocazioni/mese
  - ⚠️ Supera ampiamente limite → $80-100/mese con extra fees

Neon Launch: $19/mese
  - 1.5GB storage stimato
  - 200 compute hours/mese
  
Firebase: $20-40/mese
  - 560 utenti attivi
  - ~25GB storage file

TOTALE: $119-159/mese ⚠️
```

#### **Dopo Fase 2 + 3 + 4 (Completo)**
```
Vercel Pro: $20/mese
  - ~500k invocazioni/mese
  - ✅ Ottimale

Neon Launch: $19/mese
  - 0.8GB storage (cleanup aggressivo)
  - 150 compute hours/mese
  
Firebase: $25-45/mese
  - FCM ~500k notifiche/mese (free)
  - Storage ~20GB (archiving vecchi file)

Upstash Redis (opzionale): $10/mese
  - Caching aggressivo
  
TOTALE: $74-94/mese ✅ (-40% rispetto a non ottimizzato)
```

---

## 🚨 PRIORITÀ E DECISIONI CRITICHE

### Quando Implementare Ogni Fase

#### **Fase 1: ✅ GIÀ COMPLETATA**
Implementazione immediata, zero downtime.

#### **Fase 2 (FCM): 🔴 CRITICA**
**Quando:** Prima di andare in produzione con 50+ utenti attivi
**Perché:** Senza FCM, superi limite Vercel Pro (3M invocazioni)
**Tempo:** 2-3 settimane sviluppo + testing
**Rischio:** Alto - richiede setup Firebase corretto e testing cross-browser

#### **Fase 3 (SSE Studenti): 🟡 IMPORTANTE**
**Quando:** Prima di avere 10+ sessioni Virtual Room simultanee/giorno
**Perché:** Virtual Room è il bottleneck principale (87% delle queries)
**Tempo:** 1-2 settimane sviluppo + testing
**Rischio:** Medio - SSE già funziona per admin, estensione relativamente sicura

#### **Fase 4 (Cleanup): 🟢 GRADUALE**
**Quando:** Subito per setup, risultati visibili dopo 3-6 mesi
**Perché:** Previene crescita incontrollata database
**Tempo:** 1 settimana setup iniziale
**Rischio:** Basso - già implementato, solo configurazione

#### **Fase 5 (Caching Avanzato): 🟢 OPZIONALE**
**Quando:** Solo se monitoring mostra query lente o Neon compute alto
**Perché:** Ottimizzazione fine, non bloccante
**Tempo:** 1 settimana
**Rischio:** Basso

---

## 📊 MONITORING & ALERTS

### Metriche Critiche da Monitorare

```typescript
// lib/monitoring/metrics.ts

export interface SystemMetrics {
  // Vercel
  serverlessInvocations: number;      // Target: < 2.5M/mese
  averageResponseTime: number;         // Target: < 500ms
  errorRate: number;                   // Target: < 1%
  
  // Neon PostgreSQL
  databaseSize: number;                // Target: < 9GB (Launch tier)
  computeHours: number;                // Target: < 280h/mese
  activeConnections: number;           // Target: < 50
  slowQueries: number;                 // Target: < 10/giorno
  
  // Firebase
  fcmNotificationsSent: number;        // Target: < 900k/mese (sotto free tier)
  storageUsed: number;                 // Target: < 4.5GB (Free tier)
  authActiveUsers: number;             // Tracking
  
  // Application
  activeUsers: number;
  virtualRoomSessions: number;         // Target: < 20 simultanee
  messagesPerDay: number;
  notificationsPerDay: number;
}
```

### Alert Rules (Uptime Robot / Better Uptime)

```yaml
# alerts.yml

alerts:
  - name: "Vercel Invocations High"
    condition: serverlessInvocations > 2500000
    severity: warning
    action: "Implementa Fase 2 (FCM) urgentemente"
    
  - name: "Neon Database Size High"  
    condition: databaseSize > 8.5GB
    severity: warning
    action: "Esegui cleanup manuale, considera Launch tier"
    
  - name: "Neon Compute Hours High"
    condition: computeHours > 250
    severity: warning
    action: "Ottimizza query lente, considera cache Redis"
    
  - name: "Virtual Room Sessions Concurrent"
    condition: virtualRoomSessions > 15
    severity: info
    action: "Monitor performance, preparati a scaling"
    
  - name: "Error Rate High"
    condition: errorRate > 2%
    severity: critical
    action: "Check logs immediatamente"
```

### Dashboard Monitoring (Vercel Analytics)

Aggiungi alle key metrics:
```typescript
// app/layout.tsx

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 🔧 CONFIGURAZIONI FINALI

### Environment Variables Required

```bash
# .env (production)

# Neon PostgreSQL
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require"

# Firebase (già presente)
NEXT_PUBLIC_FIREBASE_API_KEY="xxx"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="xxx"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="xxx"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="xxx"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="xxx"
NEXT_PUBLIC_FIREBASE_APP_ID="xxx"

# Firebase Cloud Messaging (NUOVO)
NEXT_PUBLIC_FIREBASE_VAPID_KEY="xxx"  # Da Firebase Console → Cloud Messaging
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'  # Già presente

# Vercel
VERCEL_URL="leonardo-school.vercel.app"

# Upstash Redis (opzionale Fase 5)
UPSTASH_REDIS_URL="https://xxx.upstash.io"
UPSTASH_REDIS_TOKEN="xxx"

# Monitoring (opzionale)
SENTRY_DSN="xxx"
BETTER_UPTIME_API_KEY="xxx"
```

### Next.js Config Optimization

```typescript
// next.config.ts

const config = {
  // ... configurazione esistente
  
  // Ottimizzazioni produzione
  compress: true,
  poweredByHeader: false,
  
  // Riduce bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Ottimizza immagini
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 giorni
  },
  
  // Headers per caching statico
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default config;
```

### Vercel.json Final Configuration

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expired-contracts",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/close-simulations",
      "schedule": "0 4 * * *"
    }
  ],
  "functions": {
    "app/**": {
      "maxDuration": 10
    },
    "app/api/**": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

---

## ✅ CHECKLIST PRE-PRODUZIONE

### Prima di Deploy in Produzione

- [ ] **Fase 1 completata** (polling ottimizzato + focus detection)
- [ ] **Fase 2 implementata** (FCM per notifiche e messaggi)
- [ ] **Fase 3 implementata** (SSE per studenti Virtual Room)
- [ ] **Database cleanup configurato** con retention policies appropriate
- [ ] **Indici database creati** per query performance-critical
- [ ] **Monitoring setup** (Vercel Analytics, logging, alerts)
- [ ] **Load testing** con 50+ utenti simultanei
- [ ] **FCM testato** su Chrome, Firefox, Safari, Mobile
- [ ] **SSE testato** con 10+ studenti in Virtual Room
- [ ] **Backup strategy** configurata per Neon (Point-in-time recovery)
- [ ] **Error handling** robusto per FCM failures
- [ ] **Documentation** aggiornata per team

### Deployment Strategy

1. **Staging Environment**
   - Deploy con Vercel Preview
   - Test con utenti beta (5-10 persone)
   - Monitor per 1 settimana

2. **Gradual Rollout**
   - Deploy FCM in produzione ma disabilitato
   - Abilita per 10% utenti
   - Monitor 24h
   - Abilita per 50% utenti
   - Monitor 48h
   - Abilita per 100% utenti

3. **Rollback Plan**
   - Mantieni polling come fallback
   - Feature flag per disabilitare FCM se problemi
   - Rollback immediato se error rate > 5%

---

## 🎓 BEST PRACTICES FINALI

### Codice & Architettura

1. **Separazione Concerns:**
   - FCM logic in `server/services/fcmService.ts`
   - SSE logic in `lib/hooks/useVirtualRoomSSE.ts`
   - Cleanup logic in `server/services/cleanupService.ts`

2. **Error Handling Robusto:**
   ```typescript
   try {
     await sendPushNotification(...);
   } catch (error) {
     // Log ma non blocca operazione principale
     console.error('[FCM] Failed to send, fallback to polling', error);
     // Fallback: invalidate query per fetch manuale
     queryClient.invalidateQueries(['notifications']);
   }
   ```

3. **Graceful Degradation:**
   - Se FCM non disponibile → polling fallback
   - Se SSE disconnette → automatic reconnect
   - Se database lento → usa cache stale mentre refetch

4. **Testing:**
   ```bash
   # Unit tests per services
   pnpm test:unit server/services/fcmService.test.ts
   
   # E2E tests per flows critici
   pnpm test:e2e tests/e2e/virtual-room.spec.ts
   
   # Load testing
   pnpm test:load 100-users-virtual-room
   ```

### Database

1. **Query Optimization:**
   - Usa `select` per limitare campi fetchati
   - Usa `include` con criterio (non fetch relazioni inutili)
   - Aggiungi indici per query frequenti

2. **Connection Pooling:**
   ```typescript
   // lib/prisma/client.ts
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
     // Ottimizza connection pool per Neon
     pool: {
       max: 10,
       min: 2,
       idleTimeoutMillis: 30000,
     },
   });
   ```

3. **Transactions Efficaci:**
   - Usa `$transaction` per operazioni atomiche
   - Keep transactions short
   - Evita nested transactions

### Monitoring & Debugging

1. **Structured Logging:**
   ```typescript
   console.log('[FCM]', { userId, success, timestamp });
   console.log('[SSE]', { sessionId, event, participantCount });
   console.log('[CLEANUP]', { table, deletedCount, duration });
   ```

2. **Performance Tracking:**
   ```typescript
   const start = Date.now();
   await someExpensiveOperation();
   const duration = Date.now() - start;
   if (duration > 1000) {
     console.warn('[PERF] Slow operation:', { duration, operation });
   }
   ```

3. **Error Tracking:**
   - Usa Sentry per error tracking in produzione
   - Log errors con context (userId, action, timestamp)
   - Setup alerts per error spikes

---

## 📝 CONCLUSIONI

### Riassunto Benefici

| Aspetto | Prima | Dopo (Fasi 1-3) | Miglioramento |
|---------|-------|------------------|---------------|
| **Invocazioni Vercel** | 8.1M/mese | 100k/mese | -98% |
| **Costo mensile (100 utenti)** | $60-80 | $28-35 | -55% |
| **Costo mensile (500 utenti)** | $150-200 | $74-94 | -52% |
| **Database storage** | Crescita illimitata | Controllato | -50% |
| **Latenza notifiche** | 60-120s | Istantanea | Real-time |
| **Latenza messaggi** | 15-30s | Istantanea | Real-time |
| **Virtual Room sync** | 1s polling | SSE real-time | Real-time |
| **User experience** | Buona | Eccellente | Significativo |

### Prossimi Step Immediati

1. **Valuta budget e timeline:** Discuti con team/stakeholders
2. **Prioritizza Fase 2 (FCM):** Critica per produzione
3. **Setup Firebase Cloud Messaging:** Ottieni VAPID key e credentials
4. **Pianifica Sprint 1:** Inizia con FCM setup base (2 settimane)
5. **Monitor metriche attuali:** Conferma necessità ottimizzazioni

### Supporto & Manutenzione

- **Revisione trimestrale:** Rivedi metriche e retention policies
- **Update dipendenze:** Mantieni Firebase SDK, Next.js, Prisma aggiornati
- **Scaling plan:** Preparati a upgrade Neon/Vercel se crescita supera proiezioni
- **Documentation:** Mantieni questo documento aggiornato con learnings

---

**Fine del documento. Per domande o supporto implementazione, contatta il team di sviluppo.**

**Ultimo aggiornamento:** 28 Gennaio 2026  
**Autore:** Leonardo School Dev Team  
**Versione:** 1.0
