/**
 * CategoryIcon — usa a primitiva `IconTile` (mesma gramática visual dos
 * ícones de menu, botões e badges) e respeita overrides configurados
 * pelo admin (biblioteca Lucide, upload no Storage ou URL externa).
 */

import {
  Apple,
  Beef,
  ShoppingBasket,
  Milk,
  Croissant,
  CupSoda,
  Coffee,
  Cookie,
  Candy,
  Snowflake,
  Sparkles,
  SprayCan,
  Package,
  Smile,
  Scissors,
  HeartPulse,
  Pill,
  Baby,
  Dumbbell,
  Dog,
  Hammer,
  ScrollText,
  PenLine,
  Popcorn,
  Soup,
  Salad,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import { useCategoryIconOverrides } from "@/hooks/use-category-icon-overrides";
import { resolveLucide } from "@/lib/category-icons-preset";

type TileSize = "lg" | "xl" | "2xl";

type Props = {
  slug: string;
  className?: string;
  size?: TileSize;
};

const DEFAULT_MAP: Record<string, LucideIcon> = {
  hortifruti: Apple,
  carnes: Beef,
  mercearia: ShoppingBasket,
  laticinios: Milk,
  padaria: Croissant,
  bebidas: CupSoda,
  bebidas_em_po: Coffee,
  biscoitos: Cookie,
  doces: Candy,
  congelados: Snowflake,
  higiene: Sparkles,
  limpeza: SprayCan,
  bucal: Smile,
  cabelo: Scissors,
  cuidados_pele: HeartPulse,
  perfumaria: Droplets,
  medicamentos: Pill,
  suplementos: Dumbbell,
  infantil: Baby,
  pet: Dog,
  bazar: Hammer,
  papel_descartaveis: ScrollText,
  papelaria: PenLine,
  snacks: Popcorn,
  prontos: Soup,
  condimentos: Salad,
  outros: Package,
};

const SIZE_MAP: Record<TileSize, string> = {
  lg: "h-14 w-14 rounded-2xl",
  xl: "h-20 w-20 rounded-[22px]",
  "2xl": "h-24 w-24 rounded-[26px]",
};

/** Tile wrapper com a mesma pele do IconTile, mas exibindo <img> ao centro. */
function ImageTile({
  src,
  alt,
  size,
  className,
}: {
  src: string;
  alt: string;
  size: TileSize;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={alt}
      className={cn(
        "relative inline-grid place-items-center overflow-hidden shrink-0",
        SIZE_MAP[size],
        "bg-gradient-to-br from-secondary to-card",
        "dark:from-[oklch(0.30_0.07_258)] dark:to-[oklch(0.22_0.06_260)]",
        "ring-1 ring-inset ring-primary/15 dark:ring-accent/30",
        "shadow-[0_6px_16px_-10px_oklch(0.44_0.12_252/0.35)]",
        "dark:shadow-[0_6px_16px_-10px_oklch(0_0_0/0.6)]",
        "transition-all duration-300 group-hover:-translate-y-0.5 group-hover:ring-accent/60",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1.5 top-1 h-1/3 rounded-t-[14px] bg-gradient-to-b from-white/70 to-transparent dark:from-white/10"
      />
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="relative h-[62%] w-[62%] object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
        }}
      />
    </span>
  );
}

export function CategoryIcon({ slug, className, size = "lg" }: Props) {
  const { data: overrides } = useCategoryIconOverrides();
  const override = overrides?.get(slug);

  if (override?.kind === "url" && override.value) {
    return <ImageTile src={override.value} alt={slug} size={size} className={className} />;
  }

  const LucideFromOverride = override?.kind === "lucide" ? resolveLucide(override.value) : null;
  const Icon = LucideFromOverride ?? DEFAULT_MAP[slug] ?? Package;

  return <IconTile icon={Icon} size={size} tone="surface" interactive density="spacious" className={className} />;
}

