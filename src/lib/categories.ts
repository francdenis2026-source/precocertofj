import {
  Apple,
  Baby,
  Beef,
  Croissant,
  Cross,
  Droplets,
  Milk,
  Package,
  ShoppingBasket,
  Sparkles,
  Wine,
  type LucideIcon,
} from "lucide-react";

/**
 * Canonical category set for PricePal.
 *
 * `value` is the Portuguese label stored in the catalog (and expected by the
 * `c` search param / database filter) — it must not be translated.
 * `label` is the English display name used across the redesigned UI.
 */
export type Category = {
  slug: string;
  /** English display name. */
  label: string;
  /** Catalog value used for filtering — keep in Portuguese. */
  value: string;
  Icon: LucideIcon;
};

export const CATEGORIES: Category[] = [
  { slug: "grocery", label: "Mercearia", value: "Mercearia", Icon: ShoppingBasket },
  { slug: "butcher", label: "Açougue", value: "Açougue", Icon: Beef },
  { slug: "produce", label: "Hortifruti", value: "Hortifruti", Icon: Apple },
  { slug: "beverages", label: "Bebidas", value: "Bebidas", Icon: Wine },
  { slug: "dairy", label: "Laticínios", value: "Laticínios", Icon: Milk },
  { slug: "bakery", label: "Padaria", value: "Padaria", Icon: Croissant },
  { slug: "cleaning", label: "Limpeza", value: "Limpeza", Icon: Droplets },
  { slug: "personal-care", label: "Higiene", value: "Higiene", Icon: Sparkles },
  { slug: "baby", label: "Infantil", value: "Infantil", Icon: Baby },
  { slug: "pharmacy", label: "Farmácia", value: "Farmácia", Icon: Cross },
  { slug: "other", label: "Outros", value: "Outros", Icon: Package },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryByValue(value: string): Category | undefined {
  const needle = value.trim().toLowerCase();
  return CATEGORIES.find((c) => c.value.toLowerCase() === needle);
}

/** Nome de exibição em português para uma categoria do catálogo. */
export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "Outros";
  return categoryByValue(value)?.label ?? value;
}