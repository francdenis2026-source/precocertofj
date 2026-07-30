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

/**
 * Cada seção recebe uma tinta semântica distinta para diferenciar visualmente
 * dentro da mesma tela — sem cair em ruído. Tokens abaixo respeitam WCAG AA
 * em ambos os modos:
 *  - Categorias  → dourado (identidade/ação)
 *  - Populares   → âmbar (calor/tendência)
 *  - Recentes    → índigo (histórico/registro)
 *  - Sinal vivo  → esmeralda (métricas/pulso)
 */
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

  const statsOk = Boolean(stats.data?.ok);
  const statsFailed = Boolean(stats.isError || (stats.data && !stats.data.ok));

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_auto_auto_auto] gap-1.5 lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)_auto]">

      {/* ============ CATEGORIAS — tinta DOURADA (ação/identidade) ============ */}
      <section
        aria-label="Categorias populares"
        className="relative rounded-xl border border-brand-gold/30 bg-brand-gold/[0.06] p-2 lg:col-span-2 dark:bg-brand-gold/[0.08]"
      >
        <SectionHeader
          icon={<SearchIcon className="h-3 w-3" strokeWidth={2.75} />}
          tone="gold"
          eyebrow="Categorias"
          title="O que você quer comparar hoje?"
        />
        <div className="mt-1.5 -mx-1 flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
          {CATEGORIES.map((c) => (
            <button
              key={c.q}
              type="button"
              onClick={() => onPickQuery(c.q)}
              className="group snap-start inline-flex h-8 min-w-0 shrink-0 items-center gap-1.5 rounded-lg border border-brand-gold/25 bg-background/95 px-2 text-left text-[13px] font-medium tracking-tight text-foreground transition-all hover:-translate-y-px hover:border-brand-gold hover:bg-[var(--pc-hover-tint)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span
                aria-hidden
                className="grid h-5 w-5 flex-none place-items-center rounded-md bg-brand-gold/20 text-gold-ink-soft transition-colors dark:text-gold-ink group-hover:bg-brand-gold group-hover:text-brand-navy dark:group-hover:text-brand-navy"
              >
                <c.Icon className="h-3 w-3" strokeWidth={2.25} />
              </span>
              <span className="truncate">{c.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ============ POPULARES — tinta ÂMBAR (calor/tendência) ============ */}
      <section
        aria-label="Buscas populares"
        className="relative min-h-0 overflow-hidden rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-2 dark:border-amber-400/25 dark:bg-amber-400/[0.06]"
      >
        <SectionHeader
          icon={<Flame className="h-3 w-3" strokeWidth={2.75} />}
          tone="amber"
          eyebrow="Populares"
          title="Termos mais buscados agora"
        />
        <div className="mt-1.5 flex flex-wrap gap-1">
          {POPULAR.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPickQuery(p)}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-background/95 px-2.5 text-[13px] font-medium text-foreground transition-colors hover:border-amber-500 hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-400/30 dark:hover:border-amber-400 dark:hover:bg-amber-400/10"
            >
              <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden />
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* ============ RECENTES — tinta ÍNDIGO (histórico) ============ */}
      <section
        aria-label="Últimas buscas"
        className="relative min-h-0 overflow-hidden rounded-xl border border-indigo-500/25 bg-indigo-500/[0.05] p-2 dark:border-indigo-400/25 dark:bg-indigo-400/[0.06]"
      >
        <div className="flex items-center justify-between gap-2">
          <SectionHeader
            icon={<HistoryIcon className="h-3 w-3" strokeWidth={2.75} />}
            tone="indigo"
            eyebrow="Recentes"
            title="Suas últimas buscas"
          />
          {recent.length > 0 && (
            <button
              type="button"
              onClick={clearRecent}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="mt-1.5">
          {recent.length === 0 ? (
            <p className="text-[13px] leading-snug text-muted-foreground">
              Nenhuma busca ainda — as próximas aparecem aqui para você reabrir com um clique.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {recent.slice(0, 8).map((t) => (
                <span
                  key={t}
                  className="group inline-flex shrink-0 items-center gap-0.5 rounded-full border border-indigo-500/30 bg-background/95 py-0.5 pl-2.5 pr-0.5 text-[13px] text-foreground dark:border-indigo-400/30"
                >
                  <button
                    type="button"
                    onClick={() => onPickQuery(t)}
                    className="max-w-[8.5rem] truncate rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    title={t}
                  >
                    {t}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecent(t)}
                    className="grid h-4.5 w-4.5 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                    aria-label={`Remover ${t}`}
                  >
                    <XIcon className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ SINAL DE VIDA — tinta ESMERALDA (métricas) ============ */}
      <section
        aria-label="Sinal de vida da plataforma"
        className="relative rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-2 lg:col-span-2 dark:border-emerald-400/25 dark:bg-emerald-400/[0.06]"
      >
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <SectionHeader
            icon={<Clock className="h-3 w-3" strokeWidth={2.75} />}
            tone="emerald"
            eyebrow={`Últimos ${stats.data?.windowDays ?? 30} dias`}
            title="Sinal de vida"
          />
          <span className="min-w-0 truncate text-[12.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {statsFailed
              ? "Dados indisponíveis"
              : stats.data?.generatedAt
                ? `Atualizado ${updatedLabel(stats.data.generatedAt)}`
                : "Atualizando…"}
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <StatCell
            tone="emerald"
            icon={<TrendingDown className="h-3 w-3" aria-hidden />}
            label="Preços em queda"
            value={statsOk ? int(stats.data!.priceDrops7d ?? 0) : "—"}
            hint={`${stats.data?.windowDays ?? 30} dias`}
          />
          <StatCell
            tone="emerald"
            icon={<Sparkles className="h-3 w-3" aria-hidden />}
            label="Monitorados"
            value={statsOk ? int(stats.data!.products ?? 0) : "—"}
            hint="preço público"
          />
          <StatCell
            tone="emerald"
            icon={<Flame className="h-3 w-3" aria-hidden />}
            label="Economia média"
            value={statsOk ? brl(stats.data!.estimatedSavings ?? 0) : "—"}
            hint="por produto"
          />
        </div>
      </section>
    </div>
  );
}

type Tone = "gold" | "amber" | "indigo" | "emerald";

const TONE_BADGE: Record<Tone, string> = {
  gold: "bg-brand-gold text-brand-navy ring-brand-navy/15",
  amber: "bg-amber-500 text-white ring-amber-900/20 dark:bg-amber-400 dark:text-amber-950",
  indigo: "bg-indigo-500 text-white ring-indigo-950/20 dark:bg-indigo-400 dark:text-indigo-950",
  emerald: "bg-emerald-500 text-white ring-emerald-950/20 dark:bg-emerald-400 dark:text-emerald-950",
};

const TONE_EYEBROW: Record<Tone, string> = {
  gold: "text-[var(--pc-gold-ink)]",
  amber: "text-amber-700 dark:text-amber-300",
  indigo: "text-indigo-700 dark:text-indigo-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
};

function SectionHeader({
  icon,
  eyebrow,
  title,
  tone,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  tone: Tone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-md shadow-sm ring-1 ${TONE_BADGE[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0 leading-none">
        <div
          className={`truncate text-[11.5px] font-bold uppercase tracking-[0.16em] ${TONE_EYEBROW[tone]}`}
        >
          {eyebrow}
        </div>
        <div className="mt-0.5 truncate text-[13px] font-semibold leading-tight text-foreground">
          {title}
        </div>
      </div>
    </div>
  );
}

const TONE_STAT: Record<Tone, string> = {
  gold: "bg-brand-gold/15 text-gold-ink-soft dark:text-gold-ink",
  amber: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  indigo: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300",
  emerald: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
};

function StatCell({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: Tone;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-background/95 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span
          aria-hidden
          className={`grid h-4.5 w-4.5 shrink-0 place-items-center rounded-md ${TONE_STAT[tone]}`}
        >
          {icon}
        </span>
        <div className="truncate text-[11.5px] font-semibold uppercase leading-tight tracking-[0.1em] text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="pc-num mt-1 truncate text-[20px] font-bold tabular-nums leading-none tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-0.5 truncate text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {hint}
      </div>
    </div>
  );
}
