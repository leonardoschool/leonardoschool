const legacyFirebaseMessagingWorker = `
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration.unregister());
});
`;

export function GET() {
  return new Response(legacyFirebaseMessagingWorker, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
