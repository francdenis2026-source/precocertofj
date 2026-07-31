/**
 * Service worker de LIMPEZA (kill-switch).
 *
 * Substitui o SW antigo no mesmo caminho (/sw.js) para que navegadores que já
 * o registraram removam o cache velho e voltem a carregar o site pela rede.
 * Mantido por um ciclo de release.
 */

// Cache Storage é por origem: apagamos só os caches deste app.
function isAppCache(name) {
  return (
    /^pc-(html|images|assets)$/.test(name) ||
    /(^|-)workbox-/.test(name) ||
    /(^|-)precache-v\d+-/.test(name) ||
    /(^|-)runtime-/.test(name)
  );
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(names.filter(isAppCache).map((n) => caches.delete(n)));
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((c) => c.navigate(c.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);
