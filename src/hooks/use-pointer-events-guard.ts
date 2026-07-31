import { useEffect } from "react";

/**
 * Watchdog contra travamento de navegação.
 *
 * Overlays do Radix (drawer, sheet, dialog, tooltip) aplicam
 * `pointer-events: none` no `<body>` enquanto estão abertos. Quando um
 * overlay é desmontado durante uma navegação (por exemplo, o usuário clica
 * num link dentro do drawer), o cleanup não roda e o estilo fica preso —
 * a tela continua renderizada, mas nenhum clique funciona.
 *
 * Este hook observa o `<body>` e remove o bloqueio sempre que não existir
 * nenhum overlay modal montado.
 */
export function usePointerEventsGuard() {
  useEffect(() => {
    const body = document.body;

    const release = () => {
      if (body.style.pointerEvents !== "none") return;
      const hasModal = document.querySelector(
        '[data-radix-popper-content-wrapper], [role="dialog"][data-state="open"], [data-state="open"][data-radix-dialog-content], [vaul-drawer][data-state="open"]',
      );
      if (!hasModal) body.style.removeProperty("pointer-events");
    };

    const observer = new MutationObserver(release);
    // Só atributos: observar `childList` fazia o watchdog rodar a cada portal
    // montado (tooltip, dropdown, toast) e pesava na navegação.
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });

    const interval = window.setInterval(release, 1500);
    window.addEventListener("focus", release);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      window.removeEventListener("focus", release);
    };
  }, []);
}
