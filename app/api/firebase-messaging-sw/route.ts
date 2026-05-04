/**
 * Dynamic Firebase Messaging Service Worker
 * 
 * Genera dinamicamente il service worker con le variabili d'ambiente corrette.
 * Questo è necessario perché i service worker sono file statici e non possono
 * accedere direttamente alle variabili d'ambiente di Next.js.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const serviceWorkerContent = `
/**
 * Firebase Messaging Service Worker
 * Generated dynamically with environment variables
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase configuration (injected from environment)
const firebaseConfig = ${JSON.stringify(firebaseConfig)};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

/**
 * Handle background messages
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Leonardo School';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/images/logo-square.png',
    badge: '/images/badge-icon.png',
    tag: payload.data?.notificationId || payload.data?.conversationId || 'default',
    data: payload.data,
    actions: getNotificationActions(payload.data?.type),
    vibrate: [100, 50, 100],
    timestamp: Date.now(),
    requireInteraction: shouldRequireInteraction(payload.data?.type),
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

function getNotificationActions(type) {
  switch (type) {
    case 'NEW_MESSAGE':
      return [
        { action: 'reply', title: 'Rispondi' },
        { action: 'view', title: 'Visualizza' },
      ];
    case 'SIMULATION_STARTED':
      return [{ action: 'join', title: 'Entra ora' }];
    default:
      return [{ action: 'view', title: 'Visualizza' }];
  }
}

function shouldRequireInteraction(type) {
  return type === 'SIMULATION_STARTED' || type === 'SESSION_KICKED';
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/dashboard';

  if (data.type === 'NEW_MESSAGE' && data.conversationId) {
    targetUrl = '/messaggi?conversation=' + data.conversationId;
  } else if (data.type === 'NOTIFICATION') {
    targetUrl = '/notifiche';
  } else if (data.type === 'SIMULATION_STARTED' && data.sessionId) {
    targetUrl = '/virtual-room/' + data.sessionId;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: data });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

console.log('[SW] Firebase Messaging Service Worker loaded');
`;

  return new NextResponse(serviceWorkerContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Service-Worker-Allowed': '/',
    },
  });
}
