import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search as SearchIcon,
  Sparkles,
  Flame,
  TrendingDown,
  History as HistoryIcon,
  X as XIcon,
  Wheat,
  Bean,
  Coffee,
  Milk,
  Droplet,
  Candy,
  CookingPot,
  type LucideIcon,
} from "lucide-react";
import { getPlatformStats } from "@/lib/stores-public.functions";

const CATEGORIES: { label: string; q: string; Icon: LucideIcon }[] = [
  { label: "Arroz", q: "arroz", Icon: Wheat },
  { label: "Feijão", q: "feijão", Icon: Bean },
  { label: "Café", q: "café", Icon: Coffee },
  { label: "Leite", q: "leite", Icon: Milk },
  { label: "Óleo", q: "óleo", Icon: Droplet },
  { label: "Açúcar", q: "açúcar", Icon: Candy },
  { label: "Farinha", q: "farinha", Icon: Wheat },
  { label: "Macarrão", q: "macarrão", Icon: CookingPot },
];

const POPULAR: string[] = [
  "arroz 5kg",
  "feijão carioca",
  "café 500g",
  "leite integral",
  "óleo de soja",
  "açúcar refinado",
];

const RECENT_KEY = "search:recent-queries";

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(q: string) {
  const term = q.trim();
  if (!term || term.length < 2) return;
  try {
    const cur = readRecent().filter((x) => x.toLowerCase() !== term.toLowerCase());
    const next = [term, ...cur].slice(0, 8);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  try {
    void import("@/lib/analytics-events").then(({ trackEvent }) => {
      trackEvent("search_query", { q: term.toLowerCase().slice(0, 60) });
    });
  } catch {
    /* ignore */
  }
}


type Props = {
  onPickQuery: (q: string) => void;
};

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const int = (n: number) => new Intl.NumberFormat("pt-BR").format(n);

export function SearchDiscovery({ onPickQuery }: Props) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(readRecent()), []);
  const clearRecent = () => {
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      /* ignore */
    }
    setRecent([]);
  };
  const removeRecent = (term: string) => {
    const next = recent.filter((x) => x !== term);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const stats = useQuery({
    queryKey: ["platform-stats-discovery"],
    queryFn: () => getPlatformStats(),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-3">
      {/* Bloco principal — surface sólida com contraste WCAG AA em ambos os modos */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-gold/45 to-transparent"
        />
        <header className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gold text-brand-navy shadow-sm"
          >
            <SearchIcon className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <h2 className="font-serif text-[15px] font-semibold leading-tight tracking-tight text-foreground sm:text-[17px]">
              O que você quer comparar hoje?
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
              Toque em uma categoria para começar — ou digite um produto acima.
            </p>
          </div>
        </header>

        {/* Categorias — grid no web, carrossel no mobile. Alvos 44px. */}
        <div className="mt-3 -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.q}
              type="button"
              onClick={() => onPickQuery(c.q)}
              className="group snap-start inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-3 text-left text-[13px] font-medium tracking-tight text-foreground shadow-[0_1px_2px_-1px_color-mix(in_oklab,var(--brand-navy)_10%,transparent)] transition-all hover:-translate-y-px hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] hover:shadow-sm active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span
                aria-hidden
                className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-brand-gold/15 text-brand-gold-soft transition-colors dark:text-brand-gold group-hover:bg-brand-gold group-hover:text-brand-navy dark:group-hover:text-brand-navy group-focus-visible:bg-brand-gold group-focus-visible:text-brand-navy dark:group-focus-visible:text-brand-navy"
              >
                <c.Icon className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Buscas populares — no desktop já aparecem na sidebar */}
      <section className="lg:hidden">
        <div className="mb-2 flex items-center gap-2 px-1">
          <Flame className="h-3.5 w-3.5 text-brand-gold" aria-hidden />
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Buscas populares
          </h3>
        </div>
        <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
          {POPULAR.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPickQuery(p)}
              className="snap-start inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[12.5px] font-medium text-foreground shadow-sm transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Sparkles className="h-3 w-3 text-brand-gold" aria-hidden />
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* Buscas recentes */}
      {recent.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Suas buscas recentes
              </h3>
            </div>
            <button
              type="button"
              onClick={clearRecent}
              className="rounded px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-2 px-1">
            {recent.map((t) => (
              <span
                key={t}
                className="group inline-flex items-center gap-1 rounded-full border border-border bg-card py-1 pl-3 pr-1 text-[12.5px] text-foreground shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => onPickQuery(t)}
                  className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  {t}
                </button>
                <button
                  type="button"
                  onClick={() => removeRecent(t)}
                  className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-[var(--pc-hover-tint)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                  aria-label={`Remover ${t}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Sinal de vida — cartão próprio, mesmo padrão dos HeroMetric */}
      <section className="rounded-2xl border border-border bg-card p-2.5 shadow-sm sm:p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCell
            icon={<TrendingDown className="h-4 w-4" aria-hidden />}
            label="Preços em queda"
            value={stats.data ? int(stats.data.priceDrops7d ?? 0) : "—"}
            hint="7 dias"
          />
          <StatCell
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
            label="Produtos monitorados"
            value={stats.data ? int(stats.data.products ?? 0) : "—"}
            hint="ativos"
          />
          <StatCell
            icon={<Flame className="h-4 w-4" aria-hidden />}
            label="Economia estimada"
            value={stats.data ? brl(stats.data.estimatedSavings ?? 0) : "—"}
            hint="cesta média"
          />
        </div>
      </section>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0 rounded-xl border border-border/70 bg-background px-2.5 py-2 sm:block">
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gold/15 text-brand-gold-soft dark:text-brand-gold sm:h-6 sm:w-6"
      >
        {icon}
      </span>
      <div className="min-w-0 sm:mt-1.5">
        <div className="text-[9.5px] font-semibold uppercase leading-tight tracking-[0.12em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 truncate font-serif text-[17px] font-semibold tabular-nums leading-none tracking-tight text-foreground">
          {value}
        </div>
        <div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {hint}
        </div>
      </div>
    </div>
  );
}
