import { forwardRef, useEffect, useRef, useState } from "react";

type LazyImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "loading"> & {
  src: string;
  /** Distância antes do viewport para começar a carregar (default 200px) */
  rootMargin?: string;
  /** Placeholder mostrado antes da imagem entrar. Default: fundo neutro sutil. */
  placeholderClassName?: string;
};

/**
 * Imagem com lazy-loading via IntersectionObserver.
 *
 * - Só define `src` quando o elemento entra na área observada (rootMargin default 200px)
 * - Fallback nativo `loading="lazy"` para navegadores sem IntersectionObserver
 * - Faz fade-in ao decodificar
 * - Reserva espaço via width/height (evita CLS) — sempre passar width/height quando possível
 */
export const LazyImage = forwardRef<HTMLImageElement, LazyImageProps>(function LazyImage(
  { src, rootMargin = "200px", placeholderClassName, className, onLoad, alt, ...rest },
  forwardedRef,
) {
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const localRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <img
      {...rest}
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
      }}
      alt={alt ?? ""}
      src={visible ? src : undefined}
      loading="lazy"
      decoding="async"
      onLoad={(ev) => {
        setLoaded(true);
        onLoad?.(ev);
      }}
      data-loaded={loaded ? "true" : "false"}
      className={[
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        !loaded ? placeholderClassName ?? "bg-muted/40" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
});
