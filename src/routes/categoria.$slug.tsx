import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Beef,
  Building2,
  CalendarDays,
  Fuel,
  HardHat,
  Home as HomeIcon,
  Package,
  PawPrint,
  Phone,
  Pill,
  Search,
  Sparkles,
  ShoppingCart,
  Croissant,
  Apple,
  Wine,
  BookOpen,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StoreBadge } from "@/components/brand/StoreBadge";
import { getCategoryHub } from "@/lib/category-hub.functions";
import { CATEGORY_DEFS, categoryBySlug, norm } from "@/lib/category-hub";
import { PLANTOES, diaDaSemana, diaVigente, farmaciaPorId } from "@/lib/farmacias-plantao";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof ShoppingCart> = {
  supermercados: ShoppingCart,
  farmacias: Pill,
  acougues: Beef,
  padarias: Croissant,
  hortifruti: Apple,
  bebidas: Wine,
  limpeza: HomeIcon,
  higiene: Sparkles,
  pet: PawPrint,
  construcao: HardHat,
  postos: Fuel,
  papelaria: BookOpen,
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const Route = createFileRoute("/categoria/$slug")({
  head: ({ params }) => {
    const def = categoryBySlug(params.slug);
    const label = def?.label ?? "Categoria";
    const title = `${label} em Feijó/AC — preços e lojas | PreçoCerto`;
    const description =
      def?.desc ??
      "Compare preços por categoria nos estabelecimentos parceiros de Feijó/AC.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const def = categoryBySlug(slug);
  const fetchHub = useServerFn(getCategoryHub);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(24);

  const { data, isLoading } = useQuery({
    queryKey: ["category-hub", slug],
    queryFn: () => fetchHub({ data: { slug } }),
    enabled: Boolean(def),
    staleTime: 60_000,
  });

  const Icon = ICONS[slug] ?? Package;

  const products = useMemo(() => {
    const list = data?.products ?? [];
    const term = norm(q.trim());
    if (!term) return list;
    return list.filter((p) => norm(p.name).includes(term));
  }, [data, q]);

  if (!def) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-serif text-[24px] font-semibold">Categoria não encontrada</h1>
          <Link to="/" className="mt-4 inline-block text-[13px] font-semibold text-brand-gold underline">
            Voltar à página inicial
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-3 pb-14 pt-4 sm:px-6">
        {/* Hero compacto */}
        <header className="overflow-hidden rounded-xl border border-border/70 bg-[var(--pc-navy,#0b1e3f)] text-white shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-gold text-brand-navy">
              <Icon className="h-5 w-5" strokeWidth={2.3} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-gold">
                Categoria
              </p>
              <h1 className="truncate font-serif text-[20px] font-semibold leading-tight sm:text-[24px]">
                {def.label}
              </h1>
              <p className="mt-0.5 truncate text-[12px] text-white/70">{def.desc}</p>
            </div>
            <dl className="hidden shrink-0 gap-4 sm:flex">
              <Stat label="Produtos" value={data?.totals.products ?? 0} />
              <Stat label="Lojas" value={data?.totals.stores ?? 0} />
              <Stat label="Preços" value={data?.totals.prices ?? 0} />
            </dl>
          </div>
          <div className="flex gap-3 border-t border-white/10 px-4 py-2 sm:hidden">
            <Stat label="Produtos" value={data?.totals.products ?? 0} />
            <Stat label="Lojas" value={data?.totals.stores ?? 0} />
            <Stat label="Preços" value={data?.totals.prices ?? 0} />
          </div>
        </header>

        {/* Trilho de categorias */}
        <nav aria-label="Outras categorias" className="mt-3 -mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          <ul className="flex gap-1.5">
            {CATEGORY_DEFS.map((c) => {
              const CIcon = ICONS[c.slug] ?? Package;
              const active = c.slug === slug;
              return (
                <li key={c.slug}>
                  <Link
                    to="/categoria/$slug"
                    params={{ slug: c.slug }}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-semibold transition-colors",
                      active
                        ? "border-brand-gold bg-brand-gold text-brand-navy"
                        : "border-border bg-card text-foreground hover:border-brand-gold",
                    )}
                  >
                    <CIcon className="h-3.5 w-3.5" aria-hidden /> {c.short}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Plantão (só farmácias) */}
        {slug === "farmacias" && <PlantaoStrip />}

        {/* Lojas do nicho */}
        <section className="mt-4" aria-label={`Estabelecimentos — ${def.label}`}>
          <SectionTitle icon={Building2} title="Estabelecimentos" hint={`${data?.stores.length ?? 0} no nicho`} />
          {isLoading ? (
            <SkeletonRow />
          ) : (data?.stores.length ?? 0) === 0 ? (
            <EmptyCard text="Nenhum estabelecimento desta categoria cadastrado ainda." />
          ) : (
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {data!.stores.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/estabelecimento/$slug"
                    params={{ slug: s.slug }}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-brand-gold"
                  >
                    <StoreBadge name={s.name} logoUrl={s.logoUrl} brandColor={s.brandColor} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{s.name}</span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">
                        {s.neighborhood ?? "Feijó/AC"} · {s.productCount} item(ns) na categoria
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
                  </Link>
                  {slug === "acougues" && !s.isNicheStore && (
                    <Link
                      to="/estabelecimento/$slug/acougue"
                      params={{ slug: s.slug }}
                      className="mt-1 inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-[11px] font-semibold text-foreground hover:border-brand-gold"
                    >
                      <Beef className="h-3 w-3 text-brand-gold" aria-hidden /> Ver açougue do mercado
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Produtos do nicho */}
        <section className="mt-6" aria-label={`Produtos — ${def.label}`}>
          <SectionTitle
            icon={Package}
            title="Produtos da categoria"
            hint={`${products.length} resultado(s)`}
          />
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <label htmlFor="cat-prod-search" className="sr-only">
              Filtrar produtos da categoria
            </label>
            <input
              id="cat-prod-search"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(24);
              }}
              placeholder={`Filtrar em ${def.label.toLowerCase()}…`}
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-[13.5px] outline-none focus-visible:border-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold/50"
            />
          </div>

          {isLoading ? (
            <SkeletonRow />
          ) : products.length === 0 ? (
            <EmptyCard
              text={
                q
                  ? "Nenhum produto encontrado com esse filtro."
                  : "Ainda não há produtos desta categoria cadastrados. Colabore enviando fotos de etiquetas."
              }
              action={
                !q
                  ? { label: "Quero colaborar", onClick: () => navigate({ to: "/colaborar" }) }
                  : undefined
              }
            />
          ) : (
            <>
              <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {products.slice(0, limit).map((p) => (
                  <li key={p.key} className="flex items-center gap-2.5 px-2.5 py-2">
                    <StoreBadge name={p.cheapestStore} logoUrl={p.cheapestLogo} size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold leading-tight">
                        {p.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {p.cheapestStore}
                        {p.storeCount > 1 ? ` · ${p.storeCount} mercados` : ""}
                        {p.unit ? ` · ${p.unit}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[13.5px] font-bold tabular-nums text-foreground">
                        {brl(p.minPrice)}
                      </span>
                      {p.storeCount > 1 && p.maxPrice > p.minPrice && (
                        <span className="block text-[10.5px] tabular-nums text-muted-foreground">
                          até {brl(p.maxPrice)}
                        </span>
                      )}
                    </span>
                    <Link
                      to="/buscar"
                      search={{ q: p.name } as never}
                      aria-label={`Comparar ${p.name}`}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border text-brand-gold hover:border-brand-gold"
                    >
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              {products.length > limit && (
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + 24)}
                  className="mt-2 h-9 w-full rounded-lg border border-border bg-card text-[12.5px] font-semibold hover:border-brand-gold"
                >
                  Mostrar mais ({products.length - limit} restantes)
                </button>
              )}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center sm:text-right">
      <dt className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/60">{label}</dt>
      <dd className="text-[15px] font-bold tabular-nums text-brand-gold">{value}</dd>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Package;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
        <Icon className="h-3.5 w-3.5 text-brand-gold" aria-hidden /> {title}
      </h2>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="mt-2 space-y-1.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
      ))}
    </div>
  );
}

function EmptyCard({
  text,
  action,
}: {
  text: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mt-2 rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center">
      <p className="text-[12.5px] text-muted-foreground">{text}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 h-9 rounded-full bg-brand-gold px-4 text-[12.5px] font-bold text-brand-navy"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/** Faixa compacta com o plantão de hoje/amanhã + atalho para o calendário. */
function PlantaoStrip() {
  const hoje = diaVigente();
  const f = hoje ? farmaciaPorId(PLANTOES[hoje]) : null;
  const amanha = hoje && PLANTOES[hoje + 1] ? farmaciaPorId(PLANTOES[hoje + 1]) : null;

  return (
    <section className="mt-3 rounded-xl border border-brand-gold/60 bg-brand-gold/10 p-3" aria-label="Plantão das farmácias">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--pc-gold-ink)]">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden /> Plantão
          {hoje ? ` · hoje (${diaDaSemana(hoje)})` : ""}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
          {f ? `${f.nome} — ${f.endereco}, ${f.bairro}` : "Consulte o calendário oficial do mês"}
        </span>
        {f?.telefones[0] && (
          <a
            href={`tel:${f.telefones[0].replace(/\D/g, "")}`}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[11.5px] font-semibold"
          >
            <Phone className="h-3 w-3" aria-hidden /> {f.telefones[0]}
          </a>
        )}
        <Link
          to="/farmacias"
          className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-gold px-3 text-[11.5px] font-bold text-brand-navy"
        >
          Calendário completo <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>
      {amanha && (
        <p className="mt-1 text-[11.5px] text-muted-foreground">
          Amanhã: <strong className="font-semibold text-foreground">{amanha.nome}</strong> — {amanha.bairro}
        </p>
      )}
    </section>
  );
}
