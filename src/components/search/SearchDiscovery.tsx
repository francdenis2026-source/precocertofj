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
  Clock,
  CookingPot,
  type LucideIcon,
} from "lucide-react";
import { getPlatformStats } from "@/lib/stores-public.functions";
import {
  clearSearchHistory,
  getSearchHistory,
  pushSearchHistory,
  removeSearchHistory,
} from "@/lib/search-history";


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

/**
 * Fonte única do histórico: `@/lib/search-history`. Para visitantes anônimos o
 * histórico vive apenas em memória (limpa ao atualizar a página).
 */
function readRecent(): string[] {
  return getSearchHistory().map((e) => e.query);
}

export function pushRecentSearch(q: string) {
  const term = q.trim();
  if (!term || term.length < 2) return;
  pushSearchHistory(term);
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

const updatedLabel = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

export function SearchDiscovery({ onPickQuery }: Props) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(readRecent()), []);
  const clearRecent = () => {
    clearSearchHistory();
    setRecent([]);
  };
  const removeRecent = (term: string) => {
    setRecent(removeSearchHistory(term).map((e) => e.query));
  };


  const stats = useQuery({
    queryKey: ["platform-stats-discovery"],
    queryFn: () => getPlatformStats(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  // Números só são exibidos quando vieram do banco (`ok`). Falha ou carregamento
  // mostram "—" + aviso, nunca valores estimados no cliente.
  const statsOk = Boolean(stats.data?.ok);
  const statsFailed = Boolean(stats.isError || (stats.data && !stats.data.ok));

  return (
    <div className="space-y-3">
      {/* Bloco principal — surface sólida com contraste WCAG AA em ambos os modos */}
      <section className="relative border-t border-border/60 pt-5">
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
          <h3 className="text-[12px] font-medium text-muted-foreground">
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

      {/* Últimas buscas — trilha compacta de um único nível, sem quebra de linha */}
      {recent.length > 0 && (
        <section
          aria-label="Últimas buscas"
          className="border-t border-border/60 px-0.5 py-3"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-gold/15 text-brand-gold-soft dark:text-brand-gold"
              >
                <HistoryIcon className="h-3.5 w-3.5" />
              </span>
              <span className="shrink-0 text-[12px] font-medium text-muted-foreground">
                Últimas buscas
              </span>
              <div className="-mx-1 flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto px-1 py-0.5">
                {recent.slice(0, 6).map((t) => (
                  <span
                    key={t}
                    className="group inline-flex shrink-0 snap-start items-center gap-0.5 rounded-full border border-border bg-background py-0.5 pl-2.5 pr-0.5 text-[12px] text-foreground"
                  >
                    <button
                      type="button"
                      onClick={() => onPickQuery(t)}
                      className="max-w-[9.5rem] truncate rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                      title={t}
                    >
                      {t}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRecent(t)}
                      className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-[var(--pc-hover-tint)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                      aria-label={`Remover ${t}`}
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={clearRecent}
              className="shrink-0 rounded-md px-1.5 py-1 text-[12px] font-medium text-muted-foreground hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Limpar
            </button>
          </div>
        </section>
      )}



      {/* Sinal de vida — cartão próprio, mesmo padrão dos HeroMetric */}
      <section className="border-t border-border/60 pt-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <Clock className="h-3 w-3 text-brand-gold" aria-hidden />
            Janela: últimos {stats.data?.windowDays ?? 30} dias
          </span>
          <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {statsFailed
              ? "Dados indisponíveis"
              : stats.data?.generatedAt
                ? `Atualizado em ${updatedLabel(stats.data.generatedAt)}`
                : "Atualizando…"}
          </span>
        </div>
        {statsFailed && (
          <p
            role="status"
            className="mb-2 rounded-lg border border-border/70 px-2.5 py-2 text-[12px] leading-snug text-muted-foreground"
          >
            Não foi possível carregar os números do banco agora. Os indicadores abaixo
            aparecem zerados até a conexão ser restabelecida.
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <StatCell
            icon={<TrendingDown className="h-4 w-4" aria-hidden />}
            label="Preços em queda"
            value={statsOk ? int(stats.data!.priceDrops7d ?? 0) : "—"}
            hint={`últimos ${stats.data?.windowDays ?? 30} dias`}
          />
          <StatCell
            icon={<Sparkles className="h-4 w-4" aria-hidden />}
            label="Produtos monitorados"
            value={statsOk ? int(stats.data!.products ?? 0) : "—"}
            hint="com preço público"
          />
          <StatCell
            icon={<Flame className="h-4 w-4" aria-hidden />}
            label="Economia média"
            value={statsOk ? brl(stats.data!.estimatedSavings ?? 0) : "—"}
            hint="por produto comparado"
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
