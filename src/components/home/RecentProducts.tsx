import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Store } from "lucide-react";
import { getRecentProducts } from "@/lib/products-public.functions";


const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const relative = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (d <= 0) return "hoje";
  if (d === 1) return "há 1 dia";
  if (d < 7) return `há ${d} dias`;
  const w = Math.floor(d / 7);
  if (w === 1) return "há 1 semana";
  if (w < 5) return `há ${w} semanas`;
  const m = Math.floor(d / 30);
  return m <= 1 ? "há 1 mês" : `há ${m} meses`;
};

type Freshness = { label: string; dotClass: string; textClass: string; ringClass: string };

function freshness(iso: string): Freshness {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 7)
    return {
      label: "Disponível",
      dotClass: "bg-emerald-500",
      textClass: "text-emerald-600 dark:text-emerald-400",
      ringClass: "ring-emerald-500/30",
    };
  if (days <= 30)
    return {
      label: "Recente",
      dotClass: "bg-amber-500",
      textClass: "text-amber-600 dark:text-amber-400",
      ringClass: "ring-amber-500/30",
    };
  return {
    label: "Desatualizado",
    dotClass: "bg-zinc-400",
    textClass: "text-zinc-500 dark:text-zinc-400",
    ringClass: "ring-zinc-400/30",
  };
}


type Palette = {
  card: string;
  line: string;
  heading: string;
  ink: string;
  goldSoft: string;
  gold: string;
};

export function RecentProducts({ P, serif }: { P: Palette; serif: string }) {
  const fetchRecent = useServerFn(getRecentProducts);
  const { data } = useQuery({
    queryKey: ["home", "recent-products", 6],
    queryFn: () => fetchRecent({ data: { limit: 6 } }),
    staleTime: 60_000,
  });

  if (!data || data.length === 0) return null;


  return (
    <section
      aria-labelledby="recent-products-heading"
      className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6 lg:px-8"
    >
      <div className="mb-4 flex items-end justify-between gap-4 sm:mb-5">
        <div>
          <div
            className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: P.goldSoft }}
          >
            Recém-cadastrados
          </div>
          <h2
            id="recent-products-heading"
            className={`${serif}`}
            style={{
              color: P.heading,
              fontSize: "clamp(1.15rem, 2.4vw, 1.6rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Preços conferidos nos últimos dias
          </h2>
        </div>
        <Link
          to="/melhores-precos"
          className="hidden text-[11px] font-bold uppercase tracking-[0.16em] transition-colors hover:opacity-80 sm:inline-flex"
          style={{ color: P.gold }}
        >
          Ver mais →
        </Link>
      </div>

      {/* MOBILE: letreiro digital (marquee) — economiza tela vertical */}
      <div
        className="sm:hidden -mx-4 overflow-hidden rounded-xl border py-2"
        style={{ borderColor: P.line, background: P.card }}
        aria-label="Atualizações recentes de preço"
      >
        <div className="price-marquee flex w-max items-center gap-4 px-3">
          {[...data, ...data].map((p, i) => {
            const f = freshness(p.when);
            return (
              <Link
                key={`${p.slug}-${i}`}
                to="/produto/$slug"
                params={{ slug: p.slug }}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5"
                style={{ borderColor: P.line, background: "var(--pc-home-bg, transparent)", color: P.heading }}
                aria-label={`${p.name} — ${brl(p.price)} em ${p.marketName ?? "mercados"}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${f.dotClass}`}
                  aria-hidden
                />
                <span className="max-w-[9rem] truncate text-[11px] font-semibold leading-none">
                  {p.name}
                </span>
                <span
                  className={`${serif} tabular-nums text-[13px] leading-none`}
                  style={{ color: P.heading, letterSpacing: "-0.02em" }}
                >
                  {brl(p.price)}
                </span>
                <span className="market-name truncate text-[10px] leading-none max-w-[6rem]">
                  {p.marketName ?? "vários"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* SM+: grid completo com mais detalhes */}
      <ul className="hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {data.map((p) => (
          <li key={p.slug}>
            <Link
              to="/produto/$slug"
              params={{ slug: p.slug }}
              className="group block h-full rounded-2xl border p-3 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              style={{ borderColor: P.line, background: P.card, color: P.heading }}
              aria-label={`Ver histórico de ${p.name} em ${p.marketName ?? "mercados de Feijó"}`}
            >
              {(() => {
                const f = freshness(p.when);
                return (
                  <div
                    className={`mb-2 inline-flex items-center gap-1 rounded-full bg-background/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ring-1 ${f.ringClass} ${f.textClass}`}
                    title={`Status baseado na última coleta (${relative(p.when)})`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${f.dotClass}`} aria-hidden />
                    {f.label}
                  </div>
                );
              })()}
              <div
                className="mb-2 line-clamp-2 text-[12.5px] font-semibold leading-tight sm:text-[13px]"
                style={{ color: P.heading }}
              >
                {p.name}
              </div>
              <div
                className={`${serif} tabular-nums`}
                style={{
                  color: P.heading,
                  fontSize: "clamp(1.05rem, 2vw, 1.35rem)",
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {brl(p.price)}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                <Store
                  className="h-3 w-3 shrink-0 text-[var(--market-accent)] transition-colors group-hover:text-[var(--market-accent-hover)]"
                />
                <span className="market-name truncate text-[11px]">
                  {p.marketName ?? "Vários mercados"}
                </span>


              </div>

              <div
                className="mt-0.5 flex items-center gap-1 text-[10px]"
                style={{ color: "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)" }}
              >
                <Clock className="h-3 w-3 shrink-0" />
                <span>Coletado {relative(p.when)}</span>
                {p.stores > 1 ? (
                  <span className="ml-auto rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wider" style={{ color: P.goldSoft }}>
                    {p.stores} mercados
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

