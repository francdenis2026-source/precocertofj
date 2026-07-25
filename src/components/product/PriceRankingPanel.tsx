import { useMemo, useState } from "react";
import { ArrowDown, Crown, Store as StoreIcon, TrendingUp } from "lucide-react";
import { shortenStoreName } from "@/lib/store-name";
import { cn } from "@/lib/utils";

export type RankingStore = {
  establishment_id?: string | null;
  store_name: string;
  price: number;
  product_name?: string | null;
  last_seen_at?: string | null;
};

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/**
 * Ranking detalhado de um único produto entre os mercados do município.
 *
 * Regra de integridade: todos os números aqui (menor, maior, média, economia)
 * são calculados a partir de `stores` — ou seja, sempre do MESMO produto —
 * evitando comparar itens diferentes que apenas casam com o termo buscado.
 */
export function PriceRankingPanel({
  productName,
  sizeLabel,
  stores,
  initialVisible = 6,
  className,
  onOpenStore,
}: {
  productName: string;
  sizeLabel?: string | null;
  stores: RankingStore[];
  initialVisible?: number;
  className?: string;
  onOpenStore?: (store: RankingStore) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo(
    () =>
      [...(stores ?? [])]
        .filter((s) => Number.isFinite(Number(s.price)) && Number(s.price) > 0)
        .sort((a, b) => Number(a.price) - Number(b.price)),
    [stores],
  );

  if (ranked.length === 0) return null;

  const cheapest = ranked[0];
  const priciest = ranked[ranked.length - 1];
  const min = Number(cheapest.price);
  const max = Number(priciest.price);
  const avg = ranked.reduce((acc, s) => acc + Number(s.price), 0) / ranked.length;
  const diff = max - min;
  const diffPct = max > 0 ? (diff / max) * 100 : 0;
  const single = ranked.length === 1;

  const visible = expanded ? ranked : ranked.slice(0, initialVisible);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_color-mix(in_oklab,var(--color-foreground)_8%,transparent)] sm:p-5",
        className,
      )}
      aria-label={`Ranking de preços de ${productName}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-sans text-[9.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Ranking de preços · {ranked.length} mercado{ranked.length > 1 ? "s" : ""}
          </p>
          <h3 className="mt-1 font-display text-[15px] font-semibold leading-snug text-foreground sm:text-base">
            {productName}
            {sizeLabel ? (
              <span className="ml-1.5 font-display text-[12px] italic text-muted-foreground">
                {sizeLabel}
              </span>
            ) : null}
          </h3>
        </div>
        {!single && diff > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-savings/30 bg-savings/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-savings">
            <ArrowDown className="h-3 w-3" strokeWidth={2.4} />
            economize {formatBRL(diff)} ({diffPct.toFixed(0)}%)
          </span>
        )}
      </header>

      {/* Menor x Maior — explícitos */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-savings/30 bg-savings/[0.07] px-3 py-2.5">
          <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Menor preço do município
          </p>
          <p className="mt-1 font-display text-xl font-extrabold tabular-nums leading-none text-savings">
            {formatBRL(min)}
          </p>
          <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] font-medium text-foreground" title={cheapest.store_name}>
            <Crown className="h-3 w-3 shrink-0 text-accent" strokeWidth={2.2} />
            {shortenStoreName(cheapest.store_name)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
          <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Maior preço do município
          </p>
          <p className="mt-1 font-display text-xl font-semibold tabular-nums leading-none text-muted-foreground">
            {single ? "—" : formatBRL(max)}
          </p>
          <p className="mt-1 truncate text-[11.5px] font-medium text-muted-foreground" title={priciest.store_name}>
            {single ? "apenas 1 mercado com este item" : shortenStoreName(priciest.store_name)}
          </p>
        </div>
      </div>

      {/* Lista ordenada do menor para o maior */}
      <ol className="mt-3 divide-y divide-border rounded-xl border border-border">
        {visible.map((s, idx) => {
          const price = Number(s.price);
          const isMin = idx === 0;
          const isMax = !single && price === max;
          const overMin = price - min;
          const seen = formatDate(s.last_seen_at);
          const width = max > 0 ? Math.max(8, (price / max) * 100) : 0;
          const Row = onOpenStore ? "button" : "div";
          return (
            <li key={`${s.establishment_id ?? s.store_name}-${idx}`} className="relative">
              <Row
                {...(onOpenStore
                  ? {
                      type: "button" as const,
                      onClick: () => onOpenStore(s),
                      "aria-label": `Ver ${productName} em ${s.store_name}`,
                    }
                  : {})}
                className={cn(
                  "relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                  onOpenStore && "hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isMin && "bg-savings/[0.05]",
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 -z-0 bg-primary/[0.05]"
                  style={{ width: `${width}%` }}
                />
                <span
                  className={cn(
                    "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold",
                    isMin
                      ? "bg-savings text-background"
                      : "border border-border bg-background text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </span>
                <span className="relative z-10 min-w-0 flex-1">
                  <span
                    className="block truncate font-display text-[13px] font-medium leading-tight text-foreground"
                    title={s.store_name}
                  >
                    {shortenStoreName(s.store_name)}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                    {isMin && (
                      <span className="font-semibold uppercase tracking-wider text-savings">
                        menor preço
                      </span>
                    )}
                    {isMax && !isMin && (
                      <span className="inline-flex items-center gap-0.5 font-semibold uppercase tracking-wider">
                        <TrendingUp className="h-2.5 w-2.5" /> maior preço
                      </span>
                    )}
                    {!isMin && overMin > 0 && <span>+{formatBRL(overMin)} vs. menor</span>}
                    {seen && <span className="hidden sm:inline">· atualizado {seen}</span>}
                  </span>
                </span>
                <span
                  className={cn(
                    "relative z-10 shrink-0 font-display text-[14.5px] font-bold tabular-nums",
                    isMin ? "text-savings" : "text-foreground",
                  )}
                >
                  {formatBRL(price)}
                </span>
              </Row>
            </li>
          );
        })}
      </ol>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <StoreIcon className="h-3 w-3" /> Média do município: {formatBRL(avg)}
        </p>
        {ranked.length > initialVisible && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-border bg-background px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            {expanded ? "Ver menos" : `Ver todos os ${ranked.length} mercados`}
          </button>
        )}
      </div>
    </section>
  );
}
