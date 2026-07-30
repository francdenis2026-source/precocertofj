/**
 * Ícones oficiais dos hubs de categoria.
 *
 * Fonte única: homepage, diálogo "todas as categorias", páginas de comércio e
 * `/categoria/:slug` usam este mapa para que o mesmo nicho tenha sempre o
 * mesmo símbolo, independentemente de onde apareça.
 */
import {
  ShoppingCart,
  Pill,
  HardHat,
  Fuel,
  Croissant,
  Beef,
  Apple,
  Wine,
  PawPrint,
  BookOpen,
  Home as HomeIcon,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { CategorySlug } from "@/lib/category-hub";

export const CATEGORY_ICONS: Record<CategorySlug, LucideIcon> = {
  supermercados: ShoppingCart,
  farmacias: Pill,
  acougues: Beef,
  padarias: Croissant,
  hortifruti: Apple,
  bebidas: Wine,
  limpeza: HomeIcon,
  higiene: Sparkles,
  pet: PawPrint,
  construcao: HardHat,
  postos: Fuel,
  papelaria: BookOpen,
};

/** Ícone do hub, com fallback seguro para slugs desconhecidos. */
export function categoryIcon(slug: string | null | undefined): LucideIcon {
  return CATEGORY_ICONS[slug as CategorySlug] ?? ShoppingCart;
}
