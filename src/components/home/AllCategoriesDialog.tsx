import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

import { CATEGORY_DEFS, hubCoverageLabel } from "@/lib/category-hub";
import { categoryIcon } from "@/lib/category-icons";

type Cat = {
  slug: string;
  label: string;
  desc: string;
  /** Categorias de produto cobertas — mesmo vocabulário das páginas do comércio. */
  coverage: string;
  Icon: typeof ShoppingCart;
};

const CATEGORIES: Cat[] = CATEGORY_DEFS.map((c) => ({
  slug: c.slug,
  label: c.label,
  desc: c.desc,
  coverage: hubCoverageLabel(c.slug),
  Icon: categoryIcon(c.slug),
}));

// remove acentos + minúsculas p/ busca tolerante
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function AllCategoriesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(
      (c) =>
        norm(c.label).includes(q) ||
        norm(c.desc).includes(q) ||
        // Também casa pelo nome da categoria de produto (ex.: "laticínios"),
        // que é o vocabulário usado nas páginas do comércio.
        norm(c.coverage).includes(q),
    );
  }, [query]);

  const go = (c: Cat) => {
    onOpenChange(false);
    navigate({ to: "/categoria/$slug", params: { slug: c.slug } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 pt-5 pb-3">
          <DialogTitle className="text-[18px] font-bold">Todas as categorias</DialogTitle>
          <DialogDescription className="text-[13px]">
            Escolha uma categoria ou pesquise pelo tipo de produto (ex.: laticínios).
          </DialogDescription>
          <div className="relative mt-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <label htmlFor="cat-dialog-search" className="sr-only">
              Filtrar categorias
            </label>
            <input
              id="cat-dialog-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar categorias…"
              autoComplete="off"
              className={cn(
                "h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[14px] text-foreground",
                "placeholder:text-muted-foreground outline-none",
                "focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:border-brand/50",
              )}
            />
          </div>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto px-4 py-4">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma categoria encontrada.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => go(c)}
                    aria-label={`Pesquisar em ${c.label}`}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left",
                      "min-h-[64px] transition-all hover:-translate-y-px hover:border-brand/60 hover:shadow-md",
                      "outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                        "bg-brand/12 text-brand border border-brand/30",
                        "transition-colors group-hover:bg-brand/20",
                      )}
                      aria-hidden
                    >
                      <c.Icon className="h-5 w-5" strokeWidth={2.2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-foreground">
                        {c.label}
                      </span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">
                        {c.desc}
                      </span>
                      {/* Mapeamento explícito hub → categorias de produto da loja */}
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">
                        {c.coverage || "Nenhuma categoria de produto vinculada"}
                      </span>
                    </span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-brand opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
