import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Véu de vidro fosco exibido enquanto a lista suspensa da busca está aberta.
 *
 * Cobre apenas o conteúdo ABAIXO da barra de busca (resultados, filtros,
 * cards), desfocando-o levemente para jogar o foco na lista. Um clique no véu
 * fecha a lista.
 */
export function SearchGlassScrim({
  open,
  anchorRef,
  onDismiss,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onDismiss?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) setTop(rect.bottom + 6);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, anchorRef]);

  if (!mounted || !open || top == null) return null;

  return createPortal(
    <div
      aria-hidden="true"
      onMouseDown={onDismiss}
      onTouchStart={onDismiss}
      className="pc-search-scrim"
      style={{
        position: "fixed",
        top,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147482990,
      }}
    />,
    document.body,
  );
}
