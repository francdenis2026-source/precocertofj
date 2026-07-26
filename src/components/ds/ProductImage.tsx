import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ProductCategoryIcon,
  detectFoodCategory,
} from "@/components/ds/ProductCategoryIcon";

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  /** Nome usado no placeholder quando não há imagem (default: alt). */
  name?: string;
  brand?: string | null;
  className?: string;
  imgClassName?: string;
  /** object-fit da imagem. Default: contain. */
  fit?: "contain" | "cover";
  /** Tamanho aproximado usado para escolher iconografia/tipografia. */
  size?: "sm" | "md" | "lg";
}

// Paleta suave derivada de tokens. Deterministica pelo nome — mesmo produto,
// mesma capa, sem depender de rede.
const PALETTE = [
  ["hsl(210 40% 96%)", "hsl(217 33% 25%)"],
  ["hsl(24 90% 95%)", "hsl(24 60% 35%)"],
  ["hsl(142 40% 94%)", "hsl(142 45% 28%)"],
  ["hsl(199 65% 94%)", "hsl(199 65% 30%)"],
  ["hsl(280 40% 95%)", "hsl(280 40% 32%)"],
  ["hsl(340 50% 95%)", "hsl(340 45% 34%)"],
  ["hsl(48 70% 93%)", "hsl(38 60% 30%)"],
] as const;

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shortLabel(name: string, brand?: string | null, max = 22): string {
  const primary = (brand ? `${brand} ${name}` : name).trim();
  if (primary.length <= max) return primary;
  return primary.slice(0, max - 1).trimEnd() + "…";
}

/**
 * ProductImage — imagem de produto com fallback informativo.
 * - Lazy + async decode para não impactar performance.
 * - Sem foto: SVG profissional da categoria + nome do produto.
 * - Se a URL falhar em runtime, degrada suavemente para o placeholder.
 */
export function ProductImage({
  src,
  alt,
  name,
  brand,
  className,
  imgClassName,
  fit = "contain",
  size = "md",
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  const label = name ?? alt;
  const category = useMemo(
    () => detectFoodCategory(`${brand ?? ""} ${label}`),
    [brand, label],
  );
  const [bg, fg] = useMemo(() => {
    const idx = hashCode(`${category}|${brand ?? ""}|${label}`) % PALETTE.length;
    return PALETTE[idx]!;
  }, [category, brand, label]);

  const iconSize =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const textSize =
    size === "sm"
      ? "text-[11px]"
      : size === "lg"
        ? "text-sm"
        : "text-[11px]";
  const gap = size === "sm" ? "gap-1" : "gap-2";
  const padded = size === "sm" ? "px-2" : "px-3";
  const displayLabel = shortLabel(label, brand, size === "lg" ? 32 : 22);

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={!showImage ? { backgroundColor: bg, color: fg } : undefined}
    >
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            "h-full w-full transition-transform duration-300",
            fit === "cover" ? "object-cover" : "object-contain",
            imgClassName,
          )}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className={cn(
            "flex h-full w-full flex-col items-center justify-center text-center",
            gap,
            padded,
          )}
          style={{ color: fg }}
        >
          <ProductCategoryIcon
            category={category}
            className={cn("opacity-90", iconSize)}
            aria-hidden="true"
          />
          {size !== "sm" && (
            <span
              className={cn(
                "line-clamp-2 select-none font-medium leading-tight tracking-tight",
                textSize,
              )}
              style={{ color: fg }}
            >
              {displayLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

