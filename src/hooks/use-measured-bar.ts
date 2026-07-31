import { useCallback, useEffect, useRef } from "react";

/**
 * Mede a altura real de uma barra fixa (header do painel, faixa "Meu painel")
 * com ResizeObserver e publica o valor em uma variável CSS no `:root`.
 *
 * Por que: a altura das barras muda com densidade, zoom, quebra de linha e
 * largura da janela. Fixar o token só por media query desalinha o conteúdo
 * (primeiro card sob a barra) em tamanhos intermediários. Medindo o elemento,
 * `--pc-appbar-h` / `--pc-panelbar-h` acompanham qualquer redimensionamento.
 *
 * Uso: `const ref = useMeasuredBar("--pc-appbar-h");` → `<header ref={ref}>`.
 */
export function useMeasuredBar<T extends HTMLElement = HTMLElement>(
  cssVar: `--${string}`,
) {
  const nodeRef = useRef<T | null>(null);

  const apply = useCallback(
    (height: number) => {
      if (typeof document === "undefined") return;
      // Arredonda em 0.5px: evita reflow em loop por variação subpixel.
      const px = Math.round(height * 2) / 2;
      if (px <= 0) return;
      document.documentElement.style.setProperty(cssVar, `${px}px`);
    },
    [cssVar],
  );

  const ref = useCallback(
    (node: T | null) => {
      nodeRef.current = node;
      if (node) apply(node.getBoundingClientRect().height);
    },
    [apply],
  );

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    apply(node.getBoundingClientRect().height);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const box = entry.borderBoxSize?.[0];
        apply(box ? box.blockSize : entry.contentRect.height);
      }
    });
    observer.observe(node);

    const onResize = () => apply(node.getBoundingClientRect().height);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      // Devolve o controle ao valor declarado no CSS ao desmontar.
      document.documentElement.style.removeProperty(cssVar);
    };
  }, [apply, cssVar]);

  return ref;
}
