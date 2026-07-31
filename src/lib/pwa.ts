/**
 * Limpeza de service workers (o app deixou de usar cache offline).
 *
 * O SW antigo mantinha HTML/chunks presos no navegador, fazendo o site parecer
 * "sem atualização". Agora nenhum SW é registrado: apenas removemos os antigos
 * e limpamos os caches deste app em qualquer ambiente.
 */

const APP_CACHE_PATTERNS = [
  /^pc-(html|images|assets)$/,
  /(^|-)workbox-/,
  /(^|-)precache-v\d+-/,
  /(^|-)runtime-/,
];

async function clearAppCaches() {
  if (typeof caches === "undefined") return;
  try {
    const names = await caches.keys();
    await Promise.allSettled(
      names.filter((n) => APP_CACHE_PATTERNS.some((re) => re.test(n))).map((n) => caches.delete(n)),
    );
  } catch {
    /* cache indisponível */
  }
}

export async function setupServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((reg) => {
          const url =
            reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? "";
          return url.includes("/sw.js") || url.includes("/service-worker.js");
        })
        .map((reg) => reg.unregister()),
    );
  } catch {
    /* nada a fazer */
  }

  await clearAppCaches();
}
