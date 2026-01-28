/**
 * Firebase Messaging Service Worker
 *
 * Gestisce le notifiche push quando l'app è in background o chiusa.
 * Questo file DEVE essere nella cartella public/ per essere accessibile.
 */

// Import Firebase scripts (versione compatibile per service worker)
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Configurazione Firebase (deve corrispondere a config.ts)
// NOTA: Queste variabili vengono sostituite al build time o lette da env
const firebaseConfig = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);

// Ottieni istanza messaging
const messaging = firebase.messaging();

/**
 * Handler per messaggi in background
 * Chiamato quando l'app è chiusa o in background
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  // Estrai dati notifica
  const notificationTitle = payload.notification?.title || 'Leonardo School';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/images/logo-square.png',
    badge: '/images/badge-icon.png',
    tag: payload.data?.notificationId || payload.data?.conversationId || 'default',
    data: payload.data,
    // Azioni rapide (opzionale)
    actions: getNotificationActions(payload.data?.type),
    // Vibrazione (mobile)
    vibrate: [100, 50, 100],
    // Timestamp
    timestamp: Date.now(),
    // Richiede interazione utente per chiudere
    requireInteraction: shouldRequireInteraction(payload.data?.type),
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Determina le azioni rapide in base al tipo di notifica
 */
function getNotificationActions(type) {
  switch (type) {
    case 'NEW_MESSAGE':
      return [
        { action: 'open', title: 'Apri' },
        { action: 'dismiss', title: 'Ignora' },
      ];
    case 'SIMULATION_STARTED':
      return [
        { action: 'join', title: 'Partecipa' },
        { action: 'dismiss', title: 'Ignora' },
      ];
    default:
      return [];
  }
}

/**
 * Determina se la notifica richiede interazione
 */
function shouldRequireInteraction(type) {
  // Notifiche importanti richiedono click per chiudere
  return type === 'SIMULATION_STARTED' || type === 'SESSION_KICKED';
}

/**
 * Handler click su notifica
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Gestisci azione "dismiss"
  if (action === 'dismiss') {
    return;
  }

  // Determina URL di destinazione
  let targetUrl = '/dashboard';

  switch (data.type) {
    case 'NEW_MESSAGE':
      targetUrl = data.conversationId ? `/messaggi?conversation=${data.conversationId}` : '/messaggi';
      break;
    case 'NOTIFICATION':
      targetUrl = '/notifiche';
      break;
    case 'SIMULATION_STARTED':
      targetUrl = data.assignmentId
        ? `/virtual-room/${data.assignmentId}`
        : '/simulazioni';
      break;
    case 'SIMULATION_ENDED':
      targetUrl = data.assignmentId
        ? `/simulazioni/${data.assignmentId}/risultato`
        : '/simulazioni';
      break;
    case 'SESSION_KICKED':
      targetUrl = '/simulazioni?kicked=true';
      break;
    default:
      targetUrl = '/dashboard';
  }

  // Apri o focalizza finestra esistente
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Cerca finestra già aperta sulla stessa origine
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Naviga alla URL target
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: targetUrl,
            data: data,
          });
          return client.focus();
        }
      }

      // Nessuna finestra aperta, aprine una nuova
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Handler chiusura notifica (swipe away)
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  // Potremmo tracciare analytics qui
});

/**
 * Handler per messaggi dal client principale
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message from client:', event.data);

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Attivazione service worker
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(clients.claim());
});
