import { Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Store } from "lucide-react";
import { getRecentProducts, type RecentProduct } from "@/lib/products-public.functions";

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

export const recentProductsQuery = (
  fn: (args: { data: { limit: number } }) => Promise<RecentProduct[]>,
  limit = 6,
) =>
  queryOptions({
    queryKey: ["home", "recent-products", limit],
    queryFn: () => fn({ data: { limit } }),
    staleTime: 60_000,
  });

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
  const { data } = useSuspenseQuery(recentProductsQuery(fetchRecent, 6));

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

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {data.map((p) => (
          <li key={p.slug}>
            <Link
              to="/produto/$slug"
              params={{ slug: p.slug }}
              className="group block h-full rounded-2xl border p-3 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              style={{ borderColor: P.line, background: P.card, color: P.heading }}
              aria-label={`Ver histórico de ${p.name} em ${p.marketName ?? "mercados de Feijó"}`}
            >
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
              <div
                className="mt-2 flex items-center gap-1 text-[10.5px] font-medium"
                style={{ color: "color-mix(in oklab, var(--pc-home-ink) 65%, transparent)" }}
              >
                <Store className="h-3 w-3 shrink-0" />
                <span className="truncate">{p.marketName ?? "Vários mercados"}</span>
              </div>
              <div
                className="mt-0.5 flex items-center gap-1 text-[10px]"
                style={{ color: "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)" }}
              >
                <Clock className="h-3 w-3 shrink-0" />
                {relative(p.when)}
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
