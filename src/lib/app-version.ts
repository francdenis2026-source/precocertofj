/**
 * Versionamento + cache-busting do app.
 *
 * A cada build o Vite injeta um identificador único (`__APP_BUILD_ID__`).
 * O cliente compara periodicamente esse identificador com o que o servidor
 * responde em `/api/public/version` (resposta sempre `no-store`, portanto
 * nunca fica presa em CDN). Quando os valores divergem, significa que um novo
 * Publish substituiu a versão anterior: limpamos caches, desregistramos
 * service workers antigos e recarregamos a página uma única vez.
 */

declare const __APP_BUILD_ID__: string;

export const APP_BUILD_ID: string =
  typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "dev";

const VERSION_ENDPOINT = "/api/public/version";
const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_GUARD_KEY = "pc:last-version-reload";

async function clearAllAppCaches() {
  if (typeof caches === "undefined") return;
  try {
    const names = await caches.keys();
    await Promise.allSettled(names.map((n) => caches.delete(n)));
  } catch {
    /* cache indisponível */
  }
}

async function unregisterServiceWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(regs.map((r) => r.unregister()));
  } catch {
    /* nada a fazer */
  }
}

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`${VERSION_ENDPOINT}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: unknown };
    return typeof data.buildId === "string" ? data.buildId : null;
  } catch {
    return null;
  }
}

/** Recarrega uma única vez por versão, evitando loops de reload. */
async function applyNewVersion(remoteId: string) {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY) === remoteId) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, remoteId);
  } catch {
    /* sessionStorage bloqueado: segue com o reload mesmo assim */
  }

  await unregisterServiceWorkers();
  await clearAllAppCaches();

  const url = new URL(window.location.href);
  url.searchParams.set("v", remoteId);
  window.location.replace(url.toString());
}

async function checkOnce() {
  if (typeof window === "undefined" || document.visibilityState === "hidden") return;
  const remote = await fetchRemoteBuildId();
  if (!remote || remote === APP_BUILD_ID || APP_BUILD_ID === "dev") return;
  await applyNewVersion(remote);
}

/** Inicia o monitor de versão. Retorna a função de limpeza. */
export function setupVersionWatcher(): () => void {
  if (typeof window === "undefined") return () => {};

  void checkOnce();
  const interval = window.setInterval(() => void checkOnce(), CHECK_INTERVAL_MS);
  const onFocus = () => void checkOnce();
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
  };
}

/**
 * Ação manual: força a busca da versão publicada, limpa caches/service workers
 * e recarrega o app imediatamente (mesmo que o build id seja igual).
 */
export async function forceAppUpdate(): Promise<void> {
  if (typeof window === "undefined") return;

  const remote = (await fetchRemoteBuildId()) ?? String(Date.now());

  try {
    // Remove a trava de reload para que a nova versão possa ser aplicada agora.
    sessionStorage.removeItem(RELOAD_GUARD_KEY);
  } catch {
    /* sessionStorage bloqueado */
  }

  await unregisterServiceWorkers();
  await clearAllAppCaches();

  const url = new URL(window.location.href);
  url.searchParams.set("v", remote);
  window.location.replace(url.toString());
}
