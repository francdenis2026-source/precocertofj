import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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

/**
 * Painel "Explorar o PreçoCerto" — versão compacta editorial.
 *
 * Reúne, em uma única tela, os três blocos que antes ocupavam três seções
 * roláveis: últimos preços, benefícios e prova social. Tipografia 100%
 * TypeClear (tokens `tc`) e hierarquia por linhas finas, sem caixas pesadas.
 */

const serif = "font-['Instrument_Serif',ui-serif,Georgia,serif]";

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

const LINKS = [
  { to: "/buscar", label: "Buscar preços" },
  { to: "/estabelecimentos", label: "Mercados" },
  { to: "/melhores-precos", label: "Histórico" },
  { to: "/colaborar", label: "Colaborar" },
];

/** Ritmo compartilhado entre as colunas (hierarquia idêntica em todas as seções). */
const HEAD = "flex items-baseline justify-between gap-3 border-b pb-1.5";
const HEAD_LEFT = "flex min-w-0 items-baseline gap-2.5";
const BODY_GAP = "mt-1.5";

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


export function ExplorePanel({ onNavigate }: { onNavigate?: () => void }) {
  const fetchRecent = useServerFn(getRecentProducts);
  const fetchLive = useServerFn(getLiveTickerStats);

  const { data: recent } = useQuery({
    queryKey: ["home", "recent-products", 10],
    queryFn: () => fetchRecent({ data: { limit: 10 } }),
    staleTime: 60_000,
  });
  const { data: live } = useQuery({
    queryKey: ["home", "live-ticker-stats"],
    queryFn: () => fetchLive(),
    staleTime: 60_000,
  });

  const line = "var(--pc-home-onhero-border-soft)";
  const fg = "var(--pc-home-onhero-fg)";
  const fg70 = "var(--pc-home-onhero-fg-70)";
  const fg90 = "var(--pc-home-onhero-fg-90)";
  const glass = "var(--pc-home-onhero-glass)";
  const gold = "var(--pc-home-onhero-gold)";

  const items = (recent ?? []).slice(0, 10);

  return (
    <div className="grid h-full w-full flex-1 content-start gap-x-8 gap-y-5 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)_auto]">
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

        <ul className={`${BODY_GAP} min-h-0 flex-1 divide-y overflow-y-auto no-scrollbar`} style={{ borderColor: line, maskImage: "linear-gradient(to bottom, #000 92%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, #000 92%, transparent)" }}>
          {items.length === 0
            ? Array.from({ length: 7 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <div className="h-3 flex-1 animate-pulse rounded" style={{ background: glass }} />
                  <div className="h-3 w-16 animate-pulse rounded" style={{ background: glass }} />
                </li>
              ))
            : items.map((p) => (
                <li key={p.slug}>
                  <Link
                    to="/produto/$slug"
                    params={{ slug: p.slug }}
                    onClick={onNavigate}
                    className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1.5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p
                        className={`${tc.itemTitle} truncate group-hover:underline`}
                        style={{ color: fg }}
                      >
                        {p.name}
                      </p>
                      <p className={`${tc.meta} truncate`} style={{ color: fg70 }}>
                        {p.marketName ?? "Mercado parceiro"} · {relative(p.when)}
                        {p.stores > 1 ? ` · ${p.stores} mercados` : ""}
                      </p>
                    </div>
                    <span className={`${tc.num} shrink-0 font-semibold`} style={{ color: gold }}>
                      {brl(p.price)}
                    </span>
                  </Link>
                </li>
              ))}
        </ul>
      </section>

      {/* ---------- Benefícios + prova social ---------- */}
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
        <section aria-labelledby="explore-benefits">
          <SectionHead id="explore-benefits" kicker="Benefícios" title="Por que usar" />
          <ul className={`${BODY_GAP} grid grid-cols-2 gap-x-4 gap-y-2`}>
            {BENEFITS.map(({ Icon, title, desc }) => (
              <li key={title} className="flex min-w-0 items-start gap-2">
                <Icon className="mt-[3px] h-3.5 w-3.5 shrink-0" style={{ color: gold }} strokeWidth={2.2} aria-hidden />
                <div className="min-w-0">
                  <p className={`${tc.itemTitle} truncate`} style={{ color: fg90 }}>
                    {title}
                  </p>
                  <p className={tc.meta} style={{ color: fg70 }}>
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="explore-proof">
          <SectionHead
            id="explore-proof"
            kicker="Prova social"
            title="Quem economiza"
            aside={
              <span className={`${tc.num} inline-flex shrink-0 items-center gap-1`} style={{ color: gold }}>
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                {PLATFORM_RATING.value.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
                <span className={tc.meta} style={{ color: fg70 }}>
                  ·{PLATFORM_RATING.count}
                </span>
              </span>
            }
          />
          <ul className={`${BODY_GAP} space-y-2`}>
            {QUOTES.map((t) => (
              <li key={t.name} className="flex min-w-0 gap-2.5">
                <span
                  className={`${tc.tag} grid h-6 w-6 shrink-0 place-items-center rounded-full`}
                  style={{ background: glass, color: gold, border: `1px solid ${line}` }}
                  aria-hidden
                >
                  {t.initials}
                </span>
                <div className="min-w-0">
                  <p className={tc.body} style={{ color: fg90 }}>
                    “{t.quote}”
                  </p>
                  <p className={tc.meta} style={{ color: fg70 }}>
                    {t.name} · {t.role}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-label="Números da plataforma"
          className="mt-auto grid grid-cols-3 gap-3 border-t pt-2.5"
          style={{ borderColor: line }}
        >
          {[
            ...(live?.checkedToday ? [{ label: "Conferidos hoje", value: String(live.checkedToday) }] : []),
            { label: "Últimos 7 dias", value: String(live?.totalRecent ?? 0) },
            { label: "Avaliação", value: PLATFORM_RATING.value.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) },
            { label: "Mercados", value: "6+" },
          ].slice(0, 3).map((s) => (
            <div key={s.label} className="min-w-0">
              <p className={`${tc.num} font-semibold`} style={{ color: gold }}>
                {s.value}
              </p>
              <p className={`${tc.meta} truncate`} style={{ color: fg70 }}>
                {s.label}
              </p>
            </div>
          ))}
        </section>
      </div>

      {/* ---------- Atalhos ---------- */}
      <nav
        aria-label="Atalhos do PreçoCerto"
        className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-2.5 lg:col-span-12"
        style={{ borderColor: line }}
      >
        {LINKS.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            className={`${tc.chip} inline-flex items-center gap-1 transition-opacity hover:opacity-80`}
            style={{ color: fg90 }}
          >
            {l.label}
            <ArrowUpRight className="h-3 w-3" style={{ color: gold }} aria-hidden />
          </Link>
        ))}
      </nav>
    </div>
  );
}
