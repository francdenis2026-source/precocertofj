import { useEffect, useMemo, useState } from "react";
import { ImageOff, Package, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildResponsiveImage } from "@/lib/image-variants";

export type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  fallbackLabel?: string;
  fallbackIcon?: LucideIcon;
  width?: number;
  height?: number;
  loading?: "eager" | "lazy";
  sizes?: string;
  srcSet?: string;
  fetchPriority?: "high" | "low" | "auto";
  /** object-fit da imagem. Default: cover. Use "contain" para produtos com fundo. */
  fit?: "cover" | "contain";
  /** Desliga a geração automática de srcSet. */
  disableResponsive?: boolean;
};

export function ProductImage({
  src,
  alt,
  className,
  imageClassName,
  fallbackClassName,
  fallbackLabel,
  fallbackIcon: FallbackIcon = Package,
  width,
  height,
  loading = "lazy",
  sizes,
  srcSet,
  fetchPriority = "auto",
  fit = "cover",
  disableResponsive = false,
}: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [triedFallback, setTriedFallback] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const responsive = useMemo(() => {
    if (disableResponsive || srcSet) return { src: src ?? null, srcSet };
    return buildResponsiveImage(src, width ?? 320);
  }, [src, width, srcSet, disableResponsive]);

  // Reset o estado de "loaded" quando a src muda
  useEffect(() => {
    setLoaded(false);
    setTriedFallback(false);
    setFailedSrc(null);
  }, [responsive.src, src]);

  // Se a versão transformada falhar, cai para a URL original antes de mostrar fallback.
  const transformedFailed = failedSrc !== null && !triedFallback;
  const effectiveSrc = transformedFailed
    ? (src ?? undefined)
    : (responsive.src ?? src ?? undefined);
  const effectiveSrcSet = transformedFailed ? undefined : responsive.srcSet;
  const shouldShowImage = Boolean(effectiveSrc) && !(triedFallback && failedSrc === effectiveSrc);

  const ratioStyle =
    width && height
      ? { aspectRatio: `${width} / ${height}` as string }
      : undefined;

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-muted text-muted-foreground",
        className,
      )}
      style={ratioStyle}
    >
      {shouldShowImage ? (
        <>
          {!loaded && (
            <div
              aria-hidden
              className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-muted/60 to-muted"
            />
          )}
          <img
            src={effectiveSrc}
            srcSet={effectiveSrcSet}
            sizes={sizes}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            decoding="async"
            fetchPriority={fetchPriority}
            className={cn(
              "h-full w-full transition-[opacity,filter,transform] duration-500 ease-out",
              fit === "contain" ? "object-contain" : "object-cover",
              loaded
                ? "scale-100 opacity-100 blur-0"
                : "scale-[1.02] opacity-0 blur-md",
              imageClassName,
            )}
            onLoad={() => setLoaded(true)}
            onError={() => {
              // Primeiro erro: tenta URL original (sem transformação)
              if (!triedFallback && src && effectiveSrc !== src) {
                setTriedFallback(true);
                setLoaded(false);
                return;
              }
              setFailedSrc(effectiveSrc ?? null);
              setTriedFallback(true);
            }}
          />
        </>
      ) : (
        <div
          className={cn(
            "flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-center",
            fallbackClassName,
          )}
        >
          {src ? (
            <ImageOff className="h-6 w-6 opacity-60" aria-hidden />
          ) : (
            <FallbackIcon className="h-6 w-6 opacity-60" aria-hidden />
          )}
          {fallbackLabel && (
            <span className="line-clamp-2 text-[11px] font-semibold uppercase leading-tight tracking-wider">
              {fallbackLabel}
            </span>
          )}
          <span
            className="rounded-full bg-muted-foreground/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            aria-live="polite"
          >
            {src ? "Sem imagem" : "Foto em breve"}
          </span>
        </div>
      )}
    </div>
  );
}
