import { Clock, Store, TrendingDown, TrendingUp } from "lucide-react";

/**
 * Comparação rápida entre estabelecimentos para o mesmo produto.
 * Exibe, em uma faixa compacta: menor preço + mercado, maior preço,
 * spread percentual, atualização mais recente e nº de mercados.
 * Renderiza nada quando há menos de 2 mercados (nada a comparar).
 */
export type QuickCompareMarket = {
  marketName: string;
  priceMin: number;
  priceMax: number;
  lastSeen: string;
};

const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

function relative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 60) return "over 1 month ago";
  return `${Math.floor(days / 30)} months ago`;
}

export function QuickCompareStrip({ markets }: { markets: QuickCompareMarket[] }) {
  if (!markets || markets.length < 2) return null;

  const cheapest = [...markets].sort((a, b) => a.priceMin - b.priceMin)[0];
  const priciest = [...markets].sort((a, b) => b.priceMax - a.priceMax)[0];
  const recent = [...markets].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime(),
  )[0];
  const spread =
    priciest.priceMax > 0
      ? ((priciest.priceMax - cheapest.priceMin) / priciest.priceMax) * 100
      : 0;

  return (
    <section
      aria-label="Quick comparison across stores"
      className="rounded-2xl border border-border bg-card p-3 md:p-4"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold text-foreground md:text-base">
          Quick comparison
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <Store className="h-3 w-3" strokeWidth={2} /> {markets.length} stores
        </span>
      </header>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Cell
          tone="savings"
          icon={<TrendingDown className="h-3 w-3" strokeWidth={2.4} />}
          label="Lowest price"
          value={fmt(cheapest.priceMin)}
          hint={cheapest.marketName}
        />
        <Cell
          tone="muted"
          icon={<TrendingUp className="h-3 w-3" strokeWidth={2.4} />}
          label="Highest price"
          value={fmt(priciest.priceMax)}
          hint={priciest.marketName}
        />
        <Cell
          tone="accent"
          label="Spread"
          value={`${spread.toFixed(0)}%`}
          hint={`savings up to ${fmt(priciest.priceMax - cheapest.priceMin)}`}
        />
        <Cell
          tone="muted"
          icon={<Clock className="h-3 w-3" strokeWidth={2.4} />}
          label="Updated"
          value={relative(recent.lastSeen)}
          hint={recent.marketName}
        />
      </div>
    </section>
  );
}

function Cell({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: "savings" | "accent" | "muted";
}) {
  const toneCls =
    tone === "savings"
      ? "border-savings/40 bg-savings/10"
      : tone === "accent"
        ? "border-accent-strong/40 bg-accent/10"
        : "border-border bg-background";
  const valueCls =
    tone === "savings"
      ? "text-savings"
      : tone === "accent"
        ? "text-accent-strong"
        : "text-foreground";
  return (
    <div className={`rounded-xl border ${toneCls} px-2.5 py-2`}>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        {label}
      </p>
      <p
        className={`mt-1 font-display text-[15px] font-semibold leading-tight tabular-nums ${valueCls}`}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
