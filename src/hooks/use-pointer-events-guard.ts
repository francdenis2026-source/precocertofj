import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const MODAL_SELECTOR =
  '[role="dialog"][data-state="open"], [data-radix-dialog-content][data-state="open"], [vaul-drawer][data-state="open"], [data-radix-alert-dialog-content][data-state="open"]';

const LOCK_ATTRIBUTES = ["data-scroll-locked", "data-aria-hidden"] as const;

function hasOpenModal() {
  return document.querySelector(MODAL_SELECTOR) !== null;
}

/** Único ponto responsável por remover locks residuais de overlays. */
function releaseResidualOverlayLock() {
  if (hasOpenModal()) return;
  const body = document.body;
  body.style.removeProperty("pointer-events");
  body.style.removeProperty("overflow");
  body.style.removeProperty("padding-right");
  for (const attribute of LOCK_ATTRIBUTES) body.removeAttribute(attribute);
  document.documentElement.style.removeProperty("overflow");
}

/**
 * Watchdog contra travamento de navegação.
 *
 * Overlays do Radix (drawer, sheet, dialog, dropdown) aplicam
 * `pointer-events: none` e `data-scroll-locked` no `<body>` enquanto estão
 * abertos. Quando o overlay é desmontado durante uma navegação (o usuário
 * clica num link dentro do menu, por exemplo), o cleanup não roda e o
 * bloqueio fica preso — a tela continua renderizada, mas o mouse para de
 * funcionar.
 *
 * Aqui liberamos o body sempre que não houver overlay modal montado, e
 * também a cada troca de rota (que é justamente quando o vazamento ocorre).
 */
export function usePointerEventsGuard() {
  const locationKey = useRouterState({
    select: (s) => `${s.location.pathname}${s.location.searchStr}${s.location.hash}`,
  });

  useEffect(() => {
    const observer = new MutationObserver(releaseResidualOverlayLock);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "data-scroll-locked"],
    });

    window.addEventListener("focus", releaseResidualOverlayLock);
    window.addEventListener("pageshow", releaseResidualOverlayLock);
    document.addEventListener("visibilitychange", releaseResidualOverlayLock);

    return () => {
      observer.disconnect();
      window.removeEventListener("focus", releaseResidualOverlayLock);
      window.removeEventListener("pageshow", releaseResidualOverlayLock);
      document.removeEventListener("visibilitychange", releaseResidualOverlayLock);
    };
  }, []);

  // Toda navegação libera o body: overlays desmontados no meio da transição
  // são a causa mais comum do "mouse parou de funcionar".
  useEffect(() => {
    releaseResidualOverlayLock();
    const frame = window.requestAnimationFrame(releaseResidualOverlayLock);
    const timeout = window.setTimeout(releaseResidualOverlayLock, 180);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [locationKey]);
}
