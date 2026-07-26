import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Store, TrendingDown } from "lucide-react";
import { getSearchHighlights, type HighlightItem } from "@/lib/search-highlights.functions";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type Props = {
  onPickQuery: (q: string) => void;
};

/**
 * Descoberta com dados reais: maiores oportunidades de economia e produtos
 * com melhor cobertura entre mercados. Preenche a área ociosa de `/buscar`.
 */
export function SearchHighlights({ onPickQuery }: Props) {
  const { data, isPending } = useQuery({
    queryKey: ["search-highlights"],
    queryFn: () => getSearchHighlights(),
    staleTime: 5 * 60_000,
  });

  const opportunities = data?.opportunities ?? [];
  const covered = data?.covered ?? [];

  if (!isPending && opportunities.length === 0 && covered.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <section
        aria-label="Maiores oportunidades de economia"
        className="relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-gold/45 to-transparent"
        />
        <header className="mb-2.5 flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-gold/15 text-brand-gold-soft dark:text-brand-gold"
          >
            <TrendingDown className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-[14.5px] font-semibold leading-tight tracking-tight text-foreground">
              Onde a diferença de preço é maior
            </h2>
            <p className="text-[11.5px] leading-snug text-muted-foreground">
              Mesmo produto, mercados diferentes — quanto dá para economizar hoje.
            </p>
          </div>
        </header>

        {isPending ? (
          <SkeletonGrid rows={6} />
        ) : (
          <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((item) => (
              <li key={item.key}>
                <OpportunityCard item={item} onPick={() => onPickQuery(item.name)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(isPending || covered.length > 0) && (
        <section
          aria-label="Produtos mais comparados"
          className="rounded-2xl border border-border bg-card p-3 shadow-sm"
        >
          <header className="mb-2.5 flex items-center gap-2">
            <span
              aria-hidden
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-gold/15 text-brand-gold-soft dark:text-brand-gold"
            >
              <Store className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-[14.5px] font-semibold leading-tight tracking-tight text-foreground">
                Mais comparados nos mercados
              </h2>
              <p className="text-[11.5px] leading-snug text-muted-foreground">
                Itens presentes em vários mercados parceiros — clique para comparar.
              </p>
            </div>
          </header>

          {isPending ? (
            <SkeletonGrid rows={4} />
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {covered.map((item) => (
                <li key={item.key}>
                  <CoveredRow item={item} onPick={() => onPickQuery(item.name)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function OpportunityCard({ item, onPick }: { item: HighlightItem; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex h-full w-full flex-col gap-1.5 rounded-xl border border-border bg-background p-2.5 text-left transition-all hover:-translate-y-px hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="line-clamp-2 text-[12.5px] font-medium leading-snug tracking-tight text-foreground">
        {item.name}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className="text-[15px] font-semibold tabular-nums text-foreground">
          {brl(item.minPrice)}
        </span>
        <span className="text-[11px] text-muted-foreground line-through tabular-nums">
          {brl(item.maxPrice)}
        </span>
      </span>
      <span className="mt-auto flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-muted-foreground">
          {item.cheapestStore ?? `${item.storeCount} mercados`}
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-brand-gold px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-navy">
          −{brl(item.savings)}
        </span>
      </span>
    </button>
  );
}

function CoveredRow({ item, onPick }: { item: HighlightItem; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-2 text-left transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-medium tracking-tight text-foreground">
          {item.name}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          em {item.storeCount} mercados · a partir de {brl(item.minPrice)}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-brand-gold"
      />
    </button>
  );
}

function SkeletonGrid({ rows }: { rows: number }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-[68px] animate-pulse rounded-xl border border-border bg-muted/40" />
      ))}
    </div>
  );
}
