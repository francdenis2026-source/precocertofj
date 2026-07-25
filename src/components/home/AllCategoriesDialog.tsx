import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Zap,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Cat = {
  slug: string;
  label: string;
  desc: string;
  q: string;
  Icon: typeof ShoppingCart;
};

const CATEGORIES: Cat[] = [
  { slug: "supermercados", label: "Supermercados", desc: "Compra do mês", q: "supermercado", Icon: ShoppingCart },
  { slug: "farmacias", label: "Farmácias", desc: "Medicamentos e higiene", q: "farmácia", Icon: Pill },
  { slug: "construcao", label: "Construção", desc: "Materiais e ferramentas", q: "construção", Icon: HardHat },
  { slug: "postos", label: "Postos", desc: "Combustível e conveniência", q: "posto combustível", Icon: Fuel },
  { slug: "padarias", label: "Padarias", desc: "Pães e confeitaria", q: "padaria", Icon: Croissant },
  { slug: "acougues", label: "Açougues", desc: "Carnes e frios", q: "açougue", Icon: Beef },
  { slug: "hortifruti", label: "Hortifrúti", desc: "Frutas, legumes e verduras", q: "hortifruti", Icon: Apple },
  { slug: "bebidas", label: "Bebidas", desc: "Adega e distribuidoras", q: "bebidas", Icon: Wine },
  { slug: "pet", label: "Pet", desc: "Ração e acessórios", q: "pet shop", Icon: PawPrint },
  { slug: "papelaria", label: "Papelaria", desc: "Escritório e escolar", q: "papelaria", Icon: BookOpen },
  { slug: "casa", label: "Casa & Utilidades", desc: "Limpeza e bazar", q: "utilidades domésticas", Icon: HomeIcon },
  { slug: "eletro", label: "Eletro", desc: "Eletrodomésticos", q: "eletrodomésticos", Icon: Zap },
];

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
      (c) => norm(c.label).includes(q) || norm(c.desc).includes(q),
    );
  }, [query]);

  const go = (c: Cat) => {
    onOpenChange(false);
    navigate({ to: "/buscar", search: { q: c.q, categoria: c.slug } as never });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border px-5 pt-5 pb-3">
          <DialogTitle className="text-[18px] font-bold">Todas as categorias</DialogTitle>
          <DialogDescription className="text-[13px]">
            Escolha uma categoria ou pesquise pelo nome.
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
                    aria-label={`Buscar em ${c.label}`}
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
