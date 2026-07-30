/**
 * Card "Veredito" da Cesta Básica.
 *
 * Mostra em destaque, no topo de /cesta-basica, o mercado campeão pela
 * soma total dos itens da cesta (considerando quantidades da versão
 * ativa em basket_item_sets, quando houver override), a economia
 * absoluta e o delta percentual vs. o mercado mais caro elegível.
 *
 * Regra de elegibilidade: só entram mercados com cobertura mínima
 * `eligibleCoverage` (padrão: 60%). Mercados com poucas ocorrências
 * viesam o total (soma-se apenas o que existe) e distorcem o veredito.
 */

import { Trophy, TrendingDown, ShoppingBasket } from "lucide-react";
import { Price } from "@/components/ds/Price";
import type { BasketComparisonResult } from "@/lib/basket.functions";
import { cn } from "@/lib/utils";

type Props = {
  data: BasketComparisonResult | null;
  loading?: boolean;
  eligibleCoverage?: number;
  className?: string;
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BasketVerdictHero({ data, loading, eligibleCoverage = 0.6, className }: Props) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-border bg-surface p-6 animate-pulse",
          className,
        )}
        aria-busy="true"
      >
        <div className="h-4 w-40 rounded bg-muted/60 mb-3" />
        <div className="h-7 w-56 rounded bg-muted/60 mb-2" />
        <div className="h-3 w-72 rounded bg-muted/50" />
      </div>
    );
  }

  if (!data || data.stores.length === 0) return null;

  const eligible = data.stores.filter((s) => s.coverage >= eligibleCoverage);
  const pool = eligible.length > 0 ? eligible : data.stores;
  const sorted = [...pool].sort((a, b) => a.total - b.total);
  const champion = sorted[0];
  const priciest = sorted[sorted.length - 1];
  const savings = Math.max(0, priciest.total - champion.total);
  const deltaPct = priciest.total > 0 ? (savings / priciest.total) * 100 : 0;

  const set = data.activeSet;

  return (
    <section
      data-testid="basket-verdict-hero"
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border pc-elite-frame",
        "bg-gradient-to-br from-surface via-surface to-surface-2",
        "p-6 md:p-8",
        className,
      )}
      aria-label="Veredito da cesta básica"
    >
      <header className="flex items-center gap-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
        <Trophy className="h-3.5 w-3.5 text-[color:var(--pc-accent-gold,#c9a24a)]" />
        Veredito da cesta
        {set ? (
          <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
            Conjunto ativo · v{set.version} · {set.label}
          </span>
        ) : null}
      </header>

      <div className="mt-3 flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Mercado mais em conta agora</p>
        <h2
          data-testid="basket-verdict-champion"
          className="text-2xl md:text-3xl font-serif italic text-[color:var(--pc-accent-gold,#c9a24a)] leading-tight"
        >
          {champion.establishmentName}
        </h2>

        {champion.neighborhood || champion.city ? (
          <p className="text-xs text-muted-foreground">
            {[champion.neighborhood, champion.city].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>

      <dl className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-background/60 p-4">
          <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <ShoppingBasket className="h-3.5 w-3.5" /> Total da cesta
          </dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            <Price value={champion.total} size="lg" tone="best" />
          </dd>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {champion.itemsFound}/{champion.totalItems} itens · cobertura{" "}
            {(champion.coverage * 100).toFixed(0)}%
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-4">
          <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5" /> Economia estimada
          </dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            <Price value={savings} size="md" tone="savings" />
          </dd>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            vs. {priciest.establishmentName}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background/60 p-4">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Diferença
          </dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {deltaPct.toFixed(1)}%
          </dd>
          <p className="mt-0.5 text-[11px] text-muted-foreground">mais barato que o topo</p>
        </div>
      </dl>

      {eligible.length === 0 && data.stores.length > 0 ? (
        <p className="mt-4 text-[11px] text-muted-foreground/80">
          Nenhum mercado atinge {(eligibleCoverage * 100).toFixed(0)}% de cobertura — veredito
          calculado sobre a cesta parcial disponível.
        </p>
      ) : null}
    </section>
  );
}
