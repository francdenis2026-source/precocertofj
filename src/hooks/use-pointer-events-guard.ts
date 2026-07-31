import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const MODAL_SELECTOR =
  '[role="dialog"][data-state="open"], [data-radix-dialog-content][data-state="open"], [data-radix-popper-content-wrapper], [vaul-drawer][data-state="open"], [data-radix-alert-dialog-content][data-state="open"]';

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
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const body = document.body;

    const release = () => {
      const locked =
        body.style.pointerEvents === "none" ||
        body.hasAttribute("data-scroll-locked") ||
        body.style.overflow === "hidden";
      if (!locked) return;
      if (document.querySelector(MODAL_SELECTOR)) return;
      body.style.removeProperty("pointer-events");
      body.style.removeProperty("overflow");
      body.removeAttribute("data-scroll-locked");
    };

    const observer = new MutationObserver(release);
    observer.observe(body, {
      attributes: true,
      attributeFilter: ["style", "data-scroll-locked"],
    });

    const interval = window.setInterval(release, 1000);
    window.addEventListener("focus", release);
    window.addEventListener("pointerdown", release, true);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.removeEventListener("focus", release);
      window.removeEventListener("pointerdown", release, true);
    };
  }, []);

  // Toda navegação libera o body: overlays desmontados no meio da transição
  // são a causa mais comum do "mouse parou de funcionar".
  useEffect(() => {
    const body = document.body;
    const t = window.setTimeout(() => {
      if (document.querySelector(MODAL_SELECTOR)) return;
      body.style.removeProperty("pointer-events");
      body.style.removeProperty("overflow");
      body.removeAttribute("data-scroll-locked");
    }, 60);
    return () => window.clearTimeout(t);
  }, [pathname]);
}
