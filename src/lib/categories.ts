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
  { slug: "grocery", label: "Grocery", value: "Mercearia", Icon: ShoppingBasket },
  { slug: "butcher", label: "Meat & Poultry", value: "Açougue", Icon: Beef },
  { slug: "produce", label: "Fresh Produce", value: "Hortifruti", Icon: Apple },
  { slug: "beverages", label: "Beverages", value: "Bebidas", Icon: Wine },
  { slug: "dairy", label: "Dairy", value: "Laticínios", Icon: Milk },
  { slug: "bakery", label: "Bakery", value: "Padaria", Icon: Croissant },
  { slug: "cleaning", label: "Cleaning", value: "Limpeza", Icon: Droplets },
  { slug: "personal-care", label: "Personal Care", value: "Higiene", Icon: Sparkles },
  { slug: "baby", label: "Baby", value: "Infantil", Icon: Baby },
  { slug: "pharmacy", label: "Pharmacy", value: "Farmácia", Icon: Cross },
  { slug: "other", label: "Other", value: "Outros", Icon: Package },
];

export function categoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryByValue(value: string): Category | undefined {
  const needle = value.trim().toLowerCase();
  return CATEGORIES.find((c) => c.value.toLowerCase() === needle);
}

/** English display name for a stored catalog category, with a safe fallback. */
export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "Other";
  return categoryByValue(value)?.label ?? value;
}