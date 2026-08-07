import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { usePricesRealtime } from "@/hooks/usePricesRealtime";
import {
  ArrowUpRight,
  MapPin,
  ShieldCheck,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import {
  getLiveTickerStats,
  getRecentProducts,
} from "@/lib/products-public.functions";
import { PLATFORM_RATING } from "@/components/ds/RatingStars";
import { tc } from "@/lib/typeclear";
import { useVirtualRows } from "@/hooks/use-virtual-rows";
import { Price } from "@/components/ds/Price";


/**
 * Painel "Explorar o PreçoCerto" — versão compacta editorial.
 *
 * Reúne, em uma única tela, os três blocos que antes ocupavam três seções
 * roláveis: últimos preços, benefícios e prova social. Tipografia 100%
 * TypeClear (tokens `tc`) e hierarquia por linhas finas, sem caixas pesadas.
 */

const serif = "font-editorial";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const relative = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `há ${w}sem`;
  const m = Math.floor(d / 30);
  return m <= 1 ? "há 1mês" : `há ${m}meses`;
};

const BENEFITS = [
  { Icon: Wallet, title: "Economia real", desc: "O menor preço da semana em segundos." },
  { Icon: Zap, title: "Tempo real", desc: "Atualizações contínuas da comunidade." },
  { Icon: MapPin, title: "Feito para Feijó", desc: "Mercados e bairros de toda a cidade." },
  { Icon: ShieldCheck, title: "Dados verificados", desc: "Curadoria e auditoria automáticas." },
];

const QUOTES = [
  { quote: "Eu comparo em 10 segundos e economizo quase R$ 80 por mês.", name: "Maria dos Santos", role: "Centro", initials: "MS" },
  { quote: "Uso todo sábado antes de ir ao mercado. Evita surpresas no caixa.", name: "João Ferreira", role: "Segundo Distrito", initials: "JF" },
];


/** Ritmo compartilhado entre as colunas (hierarquia idêntica em todas as seções). */
const HEAD = "flex items-baseline justify-between gap-3 border-b pb-1.5";
const HEAD_LEFT = "flex min-w-0 items-baseline gap-2.5";
const BODY_GAP = "mt-2";
/** Altura fixa por linha de preço — base da virtualização (evita reflow).
    56px acomoda título + meta + o riscado do preço anterior (mini-diff). */
const ROW_PX = 56;
const ROW_H = "h-[56px]";

function Kicker({ children, accent }: { children: React.ReactNode; accent?: string }) {
  return (
    <p className={`${tc.eyebrow} shrink-0`} style={{ color: accent ?? "var(--pc-home-onhero-gold)" }}>
      {children}
    </p>
  );
}

/** Envelope cromático: cada bloco ganha tinta + faixa de acento próprios. */
function Zone({
  accent,
  bg,
  className = "",
  children,
}: {
  accent: string;
  bg: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative min-h-0 overflow-hidden rounded-[16px] border bg-[var(--bg-surface)] px-3 py-2.5 sm:px-4 sm:py-3 ${className}`}
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accent }}
      />
      {children}
    </div>
  );
}

function SectionHead({
  id,
  kicker,
  title,
  aside,
  accent,
}: {
  id: string;
  kicker: string;
  title: string;
  aside?: React.ReactNode;
  accent?: string;
}) {
  return (
    <header className={HEAD} style={{ borderColor: "var(--border-subtle)" }}>
      <div className={HEAD_LEFT}>
        <Kicker accent={accent}>{kicker}</Kicker>
        <h3
          id={id}
          className={`${serif} pc-hero-editorial truncate text-[clamp(15px,0.6vw+1.5vh,21px)] leading-tight`}
          style={{ color: "var(--pc-home-onhero-fg)" }}
        >
          {title}
        </h3>
      </div>
      {aside}
    </header>
  );
}


type PriceItem = {
  slug: string;
  name: string;
  price: number;
  when: string;
  stores: number;
  marketName?: string | null;
  previousPrice?: number | null;
  dropPct?: number | null;
};

/** Linha memoizada: só re-renderiza quando o próprio item muda. */
const PriceRow = memo(function PriceRow({
  p,
  onNavigate,
  flash,
  best,
}: {
  p: PriceItem;
  onNavigate?: () => void;
  flash?: boolean;
  /** Marca a linha como "melhor oferta" (maior economia detectada). */
  best?: boolean;
}) {
  const hasDrop = typeof p.dropPct === "number" && p.dropPct > 0 && p.previousPrice != null;
  return (
    <li
      className={ROW_H}
      style={{ contentVisibility: "auto", containIntrinsicSize: "42px" } as React.CSSProperties}
    >
      <Link
        to="/produto/$slug"
        params={{ slug: p.slug }}
        onClick={onNavigate}
        data-flash={flash ? "1" : undefined}
        data-best={best ? "1" : undefined}
        aria-label={
          best
            ? `${p.name} — melhor oferta agora, ${brl(p.price)}${hasDrop ? `, queda de ${p.dropPct}% em relação a ${brl(p.previousPrice!)}` : ""}`
            : undefined
        }
        className={`group relative grid ${ROW_H} grid-cols-[minmax(0,1fr)_auto] items-center gap-3 -mx-2 rounded-md px-2 transition-all duration-200 ease-out hover:bg-[var(--bg-surface-elevated)] hover:pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] ${flash ? "pc-live-flash" : ""}`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-1.5 left-0 w-[2px] rounded-full transition-opacity duration-200 group-hover:opacity-100 ${flash || best ? "opacity-100" : "opacity-0"}`}
          style={{ background: "var(--pc-home-onhero-gold)" }}
        />
        <div className="min-w-0">
          <p
            className={`${tc.itemTitle} flex items-center gap-1.5 truncate transition-colors group-hover:text-white`}
            style={{ color: "var(--pc-home-onhero-fg)" }}
          >
            {best ? (
              <span
                className={`${tc.eyebrow} inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5`}
                style={{
                  color: "#0b1b3a",
                  background: "var(--pc-home-onhero-gold)",
                  letterSpacing: "0.08em",
                }}
                aria-hidden
              >
                MELHOR
              </span>
            ) : null}
            <span className="truncate">{p.name}</span>
          </p>
          <p
            className={`${tc.meta} mt-0.5 truncate`}
            style={{ color: "var(--pc-home-onhero-fg-70)" }}
          >
            <span
              className={`${serif} italic transition-[filter] group-hover:brightness-110`}
              style={{ color: "var(--pc-home-onhero-gold)" }}
            >
              {p.marketName ?? "Mercado parceiro"}
            </span>
            <span className="mx-1 opacity-60">·</span>
            {relative(p.when)}
            {flash ? (
              <>
                <span className="mx-1 opacity-60">·</span>
                <span
                  className={`${tc.eyebrow} rounded-full px-1.5 py-0.5`}
                    style={{
                      color: "var(--pc-home-onhero-gold)",
                      border: "1px solid #334155",
                    }}
                >
                  novo
                </span>
              </>
            ) : p.stores > 1 ? (
              <>
                <span className="mx-1 opacity-60">·</span>
                {p.stores} mercados
              </>
            ) : null}
          </p>
        </div>
        <span className="relative flex shrink-0 flex-col items-end leading-tight">
          <Price
            value={p.price}
            size="sm"
            tone="onhero"
            className={`${tc.num} transition-transform duration-200 group-hover:-translate-x-0.5`}
          />
          {hasDrop ? (
            <span
              className={`${tc.meta} mt-0.5 inline-flex items-baseline gap-1 whitespace-nowrap`}
              style={{ color: "var(--pc-home-onhero-fg-70)" }}
              aria-label={`Preço anterior ${brl(p.previousPrice!)}, queda de ${p.dropPct}%`}
            >
              {/* Preço antigo aparece só em hover/focus — evita ruído em repouso. */}
              <Price
                aria-hidden
                value={p.previousPrice!}
                size="xs"
                tone="strike"
                className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{ color: "var(--pc-home-onhero-fg-60)" }}
              />
              <span aria-hidden className="opacity-0 transition-opacity duration-150 group-hover:opacity-80 group-focus-visible:opacity-80">
                →
              </span>
              <span
                className="font-semibold"
                style={{ color: "var(--pc-home-onhero-gold)" }}
              >
                −{p.dropPct}%
              </span>
            </span>
          ) : null}
        </span>


      </Link>
    </li>
  );
});

function RowSkeleton({ glass }: { glass: string }) {
  return (
    <li className={`flex ${ROW_H} flex-col justify-center gap-1.5`}>
      <div className="flex items-center gap-3">
        <div className="relative h-3 flex-1 overflow-hidden rounded" style={{ background: glass }}>
          <span
            aria-hidden
            className="absolute inset-y-0 -left-full w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--pc-home-onhero-gold) 30%, transparent) 50%, transparent 100%)",
              animation: "skeleton-shimmer 1.6s ease-in-out infinite",
            }}
          />
        </div>
        <div className="h-3 w-14 animate-pulse rounded" style={{ background: glass }} />
      </div>
      <div className="h-2.5 w-1/3 animate-pulse rounded" style={{ background: glass }} />
    </li>
  );
}

export function ExplorePanel({ onNavigate }: { onNavigate?: () => void }) {
  const fetchRecent = useServerFn(getRecentProducts);
  const fetchLive = useServerFn(getLiveTickerStats);
  const queryClient = useQueryClient();

  // Etapa 1: lote curto (rápido) já pinta a coluna.
  const first = useQuery({
    queryKey: ["home", "recent-products", 4],
    queryFn: () => fetchRecent({ data: { limit: 4 } }),
    staleTime: 60_000,
  });

  // Etapa 2: lote completo só depois que o painel está interativo (idle).
  const [wantsFull, setWantsFull] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setWantsFull(true));
      return () => (window as unknown as { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setWantsFull(true), 300);
    return () => window.clearTimeout(t);
  }, []);

  const full = useQuery({
    queryKey: ["home", "recent-products", 10],
    queryFn: () => fetchRecent({ data: { limit: 10 } }),
    staleTime: 60_000,
    enabled: wantsFull,
  });

  const { data: live } = useQuery({
    queryKey: ["home", "live-ticker-stats"],
    queryFn: () => fetchLive(),
    staleTime: 60_000,
  });

  // Realtime: quando `scans` ou o cache de comparação mudam, revalidamos as
  // duas queries sem recarregar a página. React Query cuida do refetch em
  // background — a UI atualiza incrementalmente.
  usePricesRealtime(
    ({ batchCount, reason }) => {
      // Em lotes muito grandes (importações em massa), o `refetchType: "active"`
      // já garante que só a query montada revalida — evitando trabalho duplo.
      queryClient.invalidateQueries({ queryKey: ["home", "recent-products", 4], refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: ["home", "recent-products", 10], refetchType: "active" });
      // As estatísticas só precisam de refresh no fim do lote, não em cada evento.
      if (reason !== "leading" || batchCount === 1) {
        queryClient.invalidateQueries({ queryKey: ["home", "live-ticker-stats"], refetchType: "active" });
      }
    },
    { debounceMs: 900, maxWaitMs: 4500 },
  );

  const line = "var(--pc-home-onhero-border-soft)";
  const fg70 = "var(--pc-home-onhero-fg-70)";
  const fg90 = "var(--pc-home-onhero-fg-90)";
  const glass = "var(--pc-home-onhero-glass)";
  const gold = "var(--pc-home-onhero-gold)";

  // Em telas pequenas a coluna mostra menos linhas; o resto fica só na rolagem.
  const [maxRows, setMaxRows] = useState(10);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setMaxRows(mq.matches ? 10 : 4);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Ordenação automática: melhor economia primeiro (maior dropPct), depois
  // menor preço absoluto para desempate. Itens sem histórico caem para o fim
  // ordenados por recência do preço (para preservar a sensação de "ao vivo").
  const raw = (full.data ?? first.data ?? []) as PriceItem[];
  const items = useMemo(() => {
    const withScore = raw.map((it) => ({
      it,
      drop: typeof it.dropPct === "number" && it.dropPct > 0 ? it.dropPct : 0,
      priceRank: typeof it.price === "number" ? it.price : Number.POSITIVE_INFINITY,
      when: it.when ? new Date(it.when).getTime() : 0,
    }));
    withScore.sort((a, b) => {
      if (b.drop !== a.drop) return b.drop - a.drop; // maior queda primeiro
      if (a.priceRank !== b.priceRank) return a.priceRank - b.priceRank; // menor preço
      return b.when - a.when; // mais recente primeiro
    });
    return withScore.map((x) => x.it).slice(0, maxRows);
  }, [raw, maxRows]);
  const bestSlug = items[0]?.dropPct && items[0].dropPct > 0 ? items[0].slug : null;
  const pendingRows = items.length > 0 ? Math.max(0, 6 - items.length) : 6;

  // Detecção de mudanças: guardamos assinatura `slug|price` do último render
  // para marcar como "flash" itens novos ou com preço alterado. O primeiro
  // render não pisca (evita ruído visual ao carregar a página).
  const seenRef = useRef<Map<string, number> | null>(null);
  const flashUntilRef = useRef<Map<string, number>>(new Map());
  const [, forceTick] = useState(0);

  useMemo(() => {
    if (items.length === 0) return;
    const now = Date.now();
    const next = new Map<string, number>();
    for (const it of items) next.set(it.slug, it.price);

    if (seenRef.current) {
      const prev = seenRef.current;
      for (const it of items) {
        const prevPrice = prev.get(it.slug);
        if (prevPrice === undefined || prevPrice !== it.price) {
          flashUntilRef.current.set(it.slug, now + 3600);
        }
      }
    }
    seenRef.current = next;
  }, [items]);

  // Limpa marcações expiradas para permitir novo flash em atualizações futuras.
  useEffect(() => {
    if (flashUntilRef.current.size === 0) return;
    const t = window.setTimeout(() => {
      const now = Date.now();
      let changed = false;
      for (const [slug, until] of flashUntilRef.current) {
        if (until <= now) {
          flashUntilRef.current.delete(slug);
          changed = true;
        }
      }
      if (changed) forceTick((n) => n + 1);
    }, 3800);
    return () => window.clearTimeout(t);
  }, [items]);

  const now = Date.now();
  const isFlashing = (slug: string) => (flashUntilRef.current.get(slug) ?? 0) > now;

  type Row = { kind: "item"; item: PriceItem } | { kind: "skeleton" };
  const rows: Row[] = [
    ...items.map((item) => ({ kind: "item" as const, item })),
    ...Array.from({ length: pendingRows }, () => ({ kind: "skeleton" as const })),
  ];

  const { setRef: setListRef, start, end, padTop, padBottom } = useVirtualRows({
    count: rows.length,
    rowHeight: ROW_PX,
  });


  const liveAccent = "var(--brand-primary)";
  const benefitAccent = "var(--text-tertiary)";
  const proofAccent = "var(--brand-primary)";

  return (
    <div className="grid h-full min-h-0 w-full grid-rows-[minmax(0,1fr)] gap-3 lg:grid-cols-12 lg:gap-5">
      {/* ---------- Zona 1: Ao vivo (azul) ---------- */}
      <Zone
        accent={liveAccent}
        bg="#1e293b"
        className="flex min-w-0 flex-col lg:col-span-7"
      >
        <section aria-labelledby="explore-prices" className="flex min-h-0 flex-1 flex-col">
          <SectionHead
            id="explore-prices"
            kicker="Ao vivo"
            title="Preços verificados"
            accent={liveAccent}
            aside={
              <Link
                to="/buscar"
                onClick={onNavigate}
                className={`${tc.chip} inline-flex shrink-0 items-center gap-1 transition-opacity hover:opacity-80`}
                style={{ color: liveAccent }}
              >
                Ver mais <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />

          <p className={`${tc.meta} mt-1.5`} style={{ color: fg70 }}>
            {live?.lastUpdate ? `Última atualização ${relative(live.lastUpdate)}` : "Consultas de preço recentes em Feijó"}
            {typeof live?.checkedToday === "number" && live.checkedToday > 0
              ? ` · ${live.checkedToday} hoje`
              : ""}
          </p>

          <ul
            ref={setListRef}
            className={`${BODY_GAP} min-h-0 flex-1 divide-y overflow-y-auto no-scrollbar`}
            style={{
              borderColor: line,
              maskImage: "linear-gradient(to bottom, #000 92%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, #000 92%, transparent)",
            }}
            aria-busy={items.length === 0}
          >
            {padTop > 0 && <li aria-hidden style={{ height: padTop }} />}
            {rows.slice(start, end).map((row, i) =>
              row.kind === "item" ? (
                <PriceRow key={row.item.slug} p={row.item} onNavigate={onNavigate} flash={isFlashing(row.item.slug)} best={row.item.slug === bestSlug} />
              ) : (
                <RowSkeleton key={`sk-${start + i}`} glass={glass} />
              ),
            )}
            {padBottom > 0 && <li aria-hidden style={{ height: padBottom }} />}
          </ul>
        </section>
      </Zone>

      {/* ---------- Coluna editorial: Benefícios (verde) + prova social (dourado) ---------- */}
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 lg:col-span-5 lg:gap-4">
        <Zone accent={benefitAccent} bg="#1e293b">
          <section aria-labelledby="explore-benefits">
            <div className={HEAD} style={{ borderColor: `color-mix(in oklab, ${benefitAccent} 32%, transparent)` }}>
              <Kicker accent={benefitAccent}>Benefícios</Kicker>
              <span className={tc.meta} style={{ color: fg70 }}>
                Por que usar
              </span>
            </div>
            <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">
              {BENEFITS.map(({ Icon, title, desc }) => (
                <li key={title} className="flex min-w-0 items-start gap-2">
                  <Icon
                    className="mt-[3px] h-4 w-4 shrink-0"
                    style={{ color: benefitAccent }}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p
                      className={`${serif} truncate text-[clamp(13px,0.3vw+1.2vh,15px)] leading-tight tracking-tight`}
                      style={{ color: fg90 }}
                    >
                      {title}
                    </p>
                    <p className={`${tc.meta} mt-0.5`} style={{ color: fg70 }}>
                      {desc}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </Zone>

        <Zone accent={proofAccent} bg="#1e293b" className="flex min-h-0 flex-col">
          <section aria-labelledby="explore-proof" className="flex min-h-0 flex-1 flex-col">
            <div className={HEAD} style={{ borderColor: `color-mix(in oklab, ${proofAccent} 32%, transparent)` }}>
              <Kicker accent={proofAccent}>Prova social</Kicker>
              <span
                className={`${tc.num} inline-flex shrink-0 items-center gap-1`}
                style={{ color: proofAccent }}
              >
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                {PLATFORM_RATING.value.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
                <span className={tc.meta} style={{ color: fg70 }}>
                  ·{PLATFORM_RATING.count}
                </span>
              </span>
            </div>
            <ul className="mt-2.5 min-h-0 flex-1 space-y-2.5 overflow-y-auto no-scrollbar [&>li:nth-child(n+2)]:hidden sm:[&>li:nth-child(n+2)]:flex">
              {QUOTES.map((t) => (
                <li key={t.name} className="flex min-w-0 gap-2.5">
                  <span
                    className={`${serif} grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px]`}
                    style={{
                      background: glass,
                      color: proofAccent,
                      border: `1px solid color-mix(in oklab, ${proofAccent} 40%, transparent)`,
                    }}
                    aria-hidden
                  >
                    {t.initials}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`${serif} italic text-[clamp(13px,0.3vw+1.2vh,15px)] leading-snug`}
                      style={{ color: fg90 }}
                    >
                      “{t.quote}”
                    </p>
                    <p
                      className={`${tc.meta} mt-1 uppercase tracking-[0.14em]`}
                      style={{ color: fg70 }}
                    >
                      {t.name} <span style={{ color: proofAccent }}>·</span> {t.role}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </Zone>
      </div>
    </div>
  );
}

