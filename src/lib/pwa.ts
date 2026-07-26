/**
 * Registro do service worker (PWA instalável com auto-update).
 *
 * Regras de segurança:
 * - Nunca registra em dev, dentro de iframe ou em hosts de preview do Lovable
 *   (senão HTML/chunks antigos ficam presos em cache).
 * - `?sw=off` funciona como chave de emergência: remove o SW e limpa caches.
 * - Em qualquer contexto recusado, desregistra SWs antigos deste app.
 */

const SW_URL = "/sw.js";

function isPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      registrations
        .filter((reg) => {
          const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? "";
          return url.includes("/sw.js") || url.includes("/service-worker.js");
        })
        .map((reg) => reg.unregister()),
    );
  } catch {
    /* nada a fazer */
  }
}

export async function setupServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";
  const blocked =
    !import.meta.env.PROD || inIframe || isPreviewHost(window.location.hostname) || killSwitch;

  if (blocked) {
    await unregisterAppServiceWorkers();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });

    // Auto-update: procura nova versão ao abrir, ao voltar para a aba e de hora em hora.
    const checkForUpdate = () => {
      registration.update().catch(() => {});
    };
    checkForUpdate();
    window.addEventListener("focus", checkForUpdate);
    window.setInterval(checkForUpdate, 60 * 60 * 1000);

    // Quando o novo SW assume o controle, recarrega uma única vez para pegar
    // a interface e os ícones novos.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  } catch {
    /* registro opcional — app continua funcionando online */
  }
}
