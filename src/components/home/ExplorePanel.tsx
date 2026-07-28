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
  if (d < 7) return `há ${d} dias`;
  const w = Math.floor(d / 7);
  if (w < 5) return `há ${w} sem`;
  const m = Math.floor(d / 30);
  return m <= 1 ? "há 1 mês" : `há ${m} meses`;
};

const BENEFITS = [
  { Icon: Wallet, title: "Economia real", desc: "Menor preço da semana em segundos." },
  { Icon: Zap, title: "Tempo real", desc: "Atualizações contínuas da comunidade." },
  { Icon: MapPin, title: "Feito para Feijó", desc: "Mercados e bairros da cidade." },
  { Icon: ShieldCheck, title: "Dados verificados", desc: "Curadoria e auditoria automática." },
];

const QUOTES = [
  { quote: "Comparo em 10 segundos e economizo quase R$ 80 por mês.", name: "Maria dos Santos", role: "Centro", initials: "MS" },
  { quote: "Uso todo sábado antes da feira. Evita frustração no caixa.", name: "João Ferreira", role: "Segundo Distrito", initials: "JF" },
];


/** Ritmo compartilhado entre as colunas (hierarquia idêntica em todas as seções). */
const HEAD = "flex items-baseline justify-between gap-3 border-b pb-1.5";
const HEAD_LEFT = "flex min-w-0 items-baseline gap-2.5";
const BODY_GAP = "mt-2";
/** Altura fixa por linha de preço — base da virtualização (evita reflow). */
const ROW_PX = 50;
const ROW_H = "h-[50px]";

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${tc.eyebrow} shrink-0`} style={{ color: "var(--pc-home-onhero-gold)" }}>
      {children}
    </p>
  );
}

function SectionHead({
  id,
  kicker,
  title,
  aside,
}: {
  id: string;
  kicker: string;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <header className={HEAD} style={{ borderColor: "var(--pc-home-onhero-border-soft)" }}>
      <div className={HEAD_LEFT}>
        <Kicker>{kicker}</Kicker>
        <h3
          id={id}
          className={`${serif} ${tc.h2} truncate`}
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
};

/** Linha memoizada: só re-renderiza quando o próprio item muda. */
const PriceRow = memo(function PriceRow({
  p,
  onNavigate,
}: {
  p: PriceItem;
  onNavigate?: () => void;
}) {
  return (
    <li
      className={ROW_H}
      style={{ contentVisibility: "auto", containIntrinsicSize: "42px" } as React.CSSProperties}
    >
      <Link
        to="/produto/$slug"
        params={{ slug: p.slug }}
        onClick={onNavigate}
        className={`group relative grid ${ROW_H} grid-cols-[minmax(0,1fr)_auto] items-center gap-3 -mx-2 rounded-md px-2 transition-all duration-200 ease-out hover:bg-[var(--pc-home-onhero-glass)] hover:pl-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pc-home-onhero-gold)]`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1.5 left-0 w-[2px] rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: "var(--pc-home-onhero-gold)" }}
        />
        <div className="min-w-0">
          <p
            className={`${tc.itemTitle} truncate transition-colors group-hover:text-white`}
            style={{ color: "var(--pc-home-onhero-fg)" }}
          >
            {p.name}
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
            {p.stores > 1 ? (
              <>
                <span className="mx-1 opacity-60">·</span>
                {p.stores} mercados
              </>
            ) : null}
          </p>
        </div>
        <span
          className={`pc-num pc-num--onhero ${tc.num} shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5`}
        >
          {brl(p.price)}
        </span>


      </Link>
    </li>
  );
});

function RowSkeleton({ glass }: { glass: string }) {
  return (
    <li className={`flex ${ROW_H} flex-col justify-center gap-1.5`}>
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 animate-pulse rounded" style={{ background: glass }} />
        <div className="h-3 w-14 animate-pulse rounded" style={{ background: glass }} />
      </div>
      <div className="h-2.5 w-1/3 animate-pulse rounded" style={{ background: glass }} />
    </li>
  );
}

export function ExplorePanel({ onNavigate }: { onNavigate?: () => void }) {
  const fetchRecent = useServerFn(getRecentProducts);
  const fetchLive = useServerFn(getLiveTickerStats);

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

  const items = ((full.data ?? first.data ?? []) as PriceItem[]).slice(0, maxRows);
  const pendingRows = items.length > 0 ? Math.max(0, 6 - items.length) : 6;

  type Row = { kind: "item"; item: PriceItem } | { kind: "skeleton" };
  const rows: Row[] = [
    ...items.map((item) => ({ kind: "item" as const, item })),
    ...Array.from({ length: pendingRows }, () => ({ kind: "skeleton" as const })),
  ];

  const { setRef: setListRef, start, end, padTop, padBottom } = useVirtualRows({
    count: rows.length,
    rowHeight: ROW_PX,
  });


  return (
    <div className="grid h-full w-full flex-1 content-start gap-x-8 gap-y-3 lg:gap-y-5 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)_auto]">
      {/* ---------- Últimos preços ---------- */}
      <section aria-labelledby="explore-prices" className="flex min-w-0 flex-col lg:col-span-7">
        <SectionHead
          id="explore-prices"
          kicker="Ao vivo"
          title="Preços conferidos"
          aside={
            <Link
              to="/buscar"
              onClick={onNavigate}
              className={`${tc.chip} inline-flex shrink-0 items-center gap-1 transition-opacity hover:opacity-80`}
              style={{ color: gold }}
            >
              Ver mais <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />

        <p className={`${tc.meta} ${BODY_GAP}`} style={{ color: fg70 }}>
          {live?.lastUpdate ? `Última atualização ${relative(live.lastUpdate)}` : "Coletas recentes em Feijó"}
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
              <PriceRow key={row.item.slug} p={row.item} onNavigate={onNavigate} />
            ) : (
              <RowSkeleton key={`sk-${start + i}`} glass={glass} />
            ),
          )}
          {padBottom > 0 && <li aria-hidden style={{ height: padBottom }} />}
        </ul>

      </section>

      {/* ---------- Coluna editorial: Benefícios + prova social ----------
          Tratada como um "recorte de revista": serif italicizado nas citações,
          fundo levemente destacado e borda dourada vertical para separar
          visualmente da coluna de dados à esquerda. */}
      <aside
        className="relative flex min-w-0 flex-col gap-4 lg:col-span-5 lg:gap-5 lg:pl-6"
        style={{
          // Sutil divisor vertical dourado apenas em desktop
          backgroundImage:
            "linear-gradient(var(--pc-home-onhero-gold), var(--pc-home-onhero-gold))",
          backgroundRepeat: "no-repeat",
          backgroundSize: "1px 100%",
          backgroundPosition: "left top",
        }}
      >
        <section aria-labelledby="explore-benefits">
          <div className="flex items-baseline justify-between gap-3">
            <Kicker>Benefícios</Kicker>
            <span className={tc.meta} style={{ color: fg70 }}>
              Por que usar
            </span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
            {BENEFITS.map(({ Icon, title, desc }) => (
              <li key={title} className="flex min-w-0 items-start gap-2.5">
                <Icon
                  className="mt-[3px] h-4 w-4 shrink-0"
                  style={{ color: gold }}
                  strokeWidth={2}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p
                    className={`${serif} truncate text-[15px] leading-tight tracking-tight`}
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

        <section aria-labelledby="explore-proof">
          <div className="flex items-baseline justify-between gap-3">
            <Kicker>Prova social</Kicker>
            <span
              className={`${tc.num} inline-flex shrink-0 items-center gap-1`}
              style={{ color: gold }}
            >
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {PLATFORM_RATING.value.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
              <span className={tc.meta} style={{ color: fg70 }}>
                ·{PLATFORM_RATING.count}
              </span>
            </span>
          </div>
          <ul className="mt-3 space-y-3 [&>li:nth-child(n+2)]:hidden sm:[&>li:nth-child(n+2)]:flex">
            {QUOTES.map((t) => (
              <li key={t.name} className="flex min-w-0 gap-3">
                <span
                  className={`${serif} grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px]`}
                  style={{ background: glass, color: gold, border: `1px solid ${line}` }}
                  aria-hidden
                >
                  {t.initials}
                </span>
                <div className="min-w-0">
                  <p
                    className={`${serif} italic text-[15px] leading-snug`}
                    style={{ color: fg90 }}
                  >
                    “{t.quote}”
                  </p>
                  <p
                    className={`${tc.meta} mt-1 uppercase tracking-[0.14em]`}
                    style={{ color: fg70 }}
                  >
                    {t.name} <span style={{ color: gold }}>·</span> {t.role}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
