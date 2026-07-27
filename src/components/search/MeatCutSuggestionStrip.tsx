import { useMemo } from "react";
import { Beef, Bird, Drumstick } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { classifyButcherCut, type ButcherProtein } from "@/lib/butcher-cuts";

/**
 * Faixa de sugestões de cortes exibida no `/buscar` quando o termo digitado
 * está relacionado a carnes ou açougues. Fornece atalhos para cortes populares
 * e um link explícito para filtrar por estabelecimentos do tipo açougue no
 * ranking. Fica oculta quando a busca não é sobre carne.
 */

const CUTS: Array<{ label: string; query: string; protein: ButcherProtein }> = [
  { label: "Picanha", query: "picanha", protein: "bovino" },
  { label: "Alcatra", query: "alcatra", protein: "bovino" },
  { label: "Coxão mole", query: "coxao mole", protein: "bovino" },
  { label: "Peito de frango", query: "peito de frango", protein: "frango" },
  { label: "Coxa de frango", query: "coxa de frango", protein: "frango" },
  { label: "Costela suína", query: "costela suina", protein: "suino" },
];

const PROTEIN_ICON: Record<ButcherProtein, typeof Beef> = {
  bovino: Beef,
  frango: Bird,
  suino: Drumstick,
};

const KEYWORDS = /a[cç]ougue|carne|corte|churrasco|proteina/i;

export function MeatCutSuggestionStrip({
  query,
  onPick,
}: {
  query: string;
  onPick: (next: string) => void;
}) {
  const hint = useMemo(() => {
    const q = (query ?? "").trim();
    if (!q) return null;
    // Ativa quando: (a) termo é um corte reconhecido, ou (b) contém uma
    // das palavras-chave amplas relacionadas a açougue/carnes.
    if (classifyButcherCut(q, null)) return "cut";
    if (KEYWORDS.test(q)) return "generic";
    return null;
  }, [query]);

  if (!hint) return null;

  return (
    <section
      aria-label="Sugestões de cortes de açougue"
      className="rounded-lg border border-brand-gold/40 bg-[color-mix(in_oklab,var(--brand-gold)_10%,transparent)] px-3 py-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[var(--pc-gold-ink)]">
          <Beef className="h-3 w-3" aria-hidden />
          {hint === "cut" ? "Corte identificado" : "Buscando por carnes?"}
        </span>
        <span className="text-[12px] text-foreground">
          {hint === "cut"
            ? "Priorizamos açougues e supermercados com esse corte."
            : "Filtre por cortes populares — resultados só incluem açougues quando o item for corte."}
        </span>
        <ul className="ml-auto flex flex-wrap gap-1.5" role="list">
          {CUTS.map((c) => {
            const Icon = PROTEIN_ICON[c.protein];
            const active = query.trim().toLowerCase() === c.query.toLowerCase();
            return (
              <li key={c.query}>
                <button
                  type="button"
                  onClick={() => onPick(c.query)}
                  aria-pressed={active}
                  className={
                    "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold " +
                    (active
                      ? "border-brand-gold bg-brand-gold text-brand-navy"
                      : "border-brand-gold/40 bg-background text-foreground hover:border-brand-gold hover:bg-[var(--pc-hover-tint)]")
                  }
                >
                  <Icon className="h-2.5 w-2.5" aria-hidden />
                  {c.label}
                </button>
              </li>
            );
          })}
          <li>
            <Link
              to="/melhores-precos"
              search={{ q: query, cat: "acougue" } as never}
              className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:border-brand-gold hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Ranking açougues
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
