import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Lista suspensa ancorada, renderizada em portal no <body>.
 *
 * Por que portal: o campo de busca vive dentro de seções com `overflow`,
 * `transform` e `backdrop-blur`, e a página tem header/abas sticky. Um painel
 * `absolute` dentro desse contexto pode ser recortado ou coberto — no mobile
 * isso escondia as sugestões por completo. Em portal com `position: fixed`, a
 * lista sempre fica acima de qualquer sticky.
 *
 * Também trata:
 *  - reposicionamento em scroll/resize (inclusive o teclado virtual);
 *  - flip para cima quando não há espaço abaixo;
 *  - fechamento ao clicar fora (mouse e toque) e ao pressionar Esc.
 */
export function AnchoredDropdown({
  anchorRef,
  open,
  onClose,
  children,
  className = "",
  maxHeight = 320,
  ariaLabel,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  maxHeight?: number;
  ariaLabel?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(
    null,
  );

  useEffect(() => setMounted(true), []);

  const measure = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const gap = 6;
    const below = window.innerHeight - r.bottom - gap - 8;
    const above = r.top - gap - 8;
    const flip = below < 160 && above > below;
    const height = Math.max(120, Math.min(maxHeight, flip ? above : below));
    setPos({
      top: flip ? Math.max(8, r.top - gap - height) : r.bottom + gap,
      left: Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8)),
      width: r.width,
      height,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onScrollOrResize = () => measure();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    window.visualViewport?.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      window.visualViewport?.removeEventListener("resize", onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, maxHeight]);

  // Fecha ao clicar/tocar fora (âncora e painel são "dentro") e no Esc.
  useEffect(() => {
    if (!open) return;
    const isInside = (target: Node | null) =>
      !!target &&
      ((anchorRef.current?.contains(target) ?? false) ||
        (panelRef.current?.contains(target) ?? false));

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const t = (e.target as Node) ?? null;
      if (!isInside(t)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open || !pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.height,
        zIndex: 2147483000,
      }}
      className={
        "overflow-auto overscroll-contain rounded-2xl border border-primary/20 bg-background shadow-2xl " +
        className
      }
    >
      {children}
    </div>,
    document.body,
  );
}
