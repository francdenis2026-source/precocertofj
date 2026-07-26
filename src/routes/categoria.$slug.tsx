import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Beef,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
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
  const [view, setView] = useState<"list" | "grid">("list");

  const { data, isLoading } = useQuery({
    queryKey: ["category-hub", slug],
    queryFn: () => fetchHub({ data: { slug } }),
    enabled: Boolean(def),
    staleTime: 60_000,
  });

  const Icon = ICONS[slug] ?? Package;
  const totalAll = data?.totals.products ?? 0;
  const totalListed = data?.products.length ?? 0;

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
      <main className="mx-auto max-w-6xl px-3 pb-14 pt-3 sm:px-6">
        {/* Hero compacto — escala tipográfica única (eyebrow 10 / título 19-22 / meta 12 / stat 15) */}
        <header className="overflow-hidden rounded-xl border border-border/70 bg-[var(--pc-navy,#0b1e3f)] text-white shadow-sm">
          <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-gold text-brand-navy sm:h-10 sm:w-10">
              <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.2} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase leading-none tracking-[0.18em] text-brand-gold">
                Categoria
              </p>
              <h1 className="mt-1 truncate font-serif text-[19px] font-semibold leading-[1.15] sm:text-[22px]">
                {def.label}
              </h1>
              <p className="mt-0.5 truncate text-[12px] leading-snug text-white/70">{def.desc}</p>
            </div>
            <dl className="hidden shrink-0 items-start gap-5 sm:flex">
              <Stat label="Produtos" value={data?.totals.products ?? 0} />
              <Stat label="Lojas" value={data?.totals.stores ?? 0} />
              <Stat label="Preços" value={data?.totals.prices ?? 0} />
            </dl>
          </div>
          <dl className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 sm:hidden">
            <div className="px-3 py-1.5">
              <Stat label="Produtos" value={data?.totals.products ?? 0} align="left" />
            </div>
            <div className="px-3 py-1.5">
              <Stat label="Lojas" value={data?.totals.stores ?? 0} align="left" />
            </div>
            <div className="px-3 py-1.5">
              <Stat label="Preços" value={data?.totals.prices ?? 0} align="left" />
            </div>
          </dl>
        </header>

        {/* Trilho de categorias — setas de navegação + roda do mouse horizontal */}
        <CategoryRail current={slug} />



        {/* Plantão (só farmácias) */}
        {slug === "farmacias" && <PlantaoStrip />}

        {/* Lojas do nicho */}
        <section className="mt-5" aria-label={`Estabelecimentos — ${def.label}`}>
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
        <section className="mt-5" aria-label={`Produtos — ${def.label}`}>
          <SectionTitle
            icon={Package}
            title="Produtos da categoria"
            hint={
              q
                ? `${products.length} de ${totalListed.toLocaleString("pt-BR")} filtrado(s)`
                : totalAll > totalListed
                  ? `${totalListed.toLocaleString("pt-BR")} exibidos de ${totalAll.toLocaleString("pt-BR")}`
                  : `${totalAll.toLocaleString("pt-BR")} produto(s)`
            }
          />
          <div className="mt-2 flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
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
            <div
              role="group"
              aria-label="Modo de exibição"
              className="flex h-10 shrink-0 items-center gap-1 rounded-lg border border-border bg-card p-1"
            >
              {([
                { id: "list", label: "Lista", Icon: List },
                { id: "grid", label: "Grade", Icon: LayoutGrid },
              ] as const).map(({ id, label, Icon: VIcon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-pressed={view === id}
                  title={label}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-md transition-colors",
                    view === id
                      ? "bg-brand-gold text-brand-navy"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <VIcon className="h-4 w-4" aria-hidden />
                  <span className="sr-only">{label}</span>
                </button>
              ))}
            </div>
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
              {view === "grid" ? (
                <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {products.slice(0, limit).map((p) => (
                    <li key={p.key}>
                      <Link
                        to="/buscar"
                        search={{ q: p.name } as never}
                        className="flex h-full items-start gap-2.5 rounded-lg border border-border bg-card p-2.5 transition-colors hover:border-brand-gold"
                      >
                        <StoreBadge name={p.cheapestStore} logoUrl={p.cheapestLogo} size="xs" />
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-[13px] font-semibold leading-tight">
                            {p.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            {p.cheapestStore}
                            {p.storeCount > 1 ? ` · ${p.storeCount} mercados` : ""}
                          </span>
                          <span className="mt-1 block text-[13.5px] font-bold tabular-nums text-foreground">
                            {brl(p.minPrice)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
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
              )}
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

/** Trilho horizontal de categorias com setas, roda do mouse e fades. */
function CategoryRail({ current }: { current: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const before = el.scrollLeft;
      el.scrollLeft += e.deltaY;
      if (el.scrollLeft !== before) e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", sync);
    // centraliza a categoria ativa
    el.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({
      inline: "center",
      block: "nearest",
    });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", sync);
    };
  }, [sync, current]);

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <nav aria-label="Outras categorias" className="relative mt-2.5">
      <div
        ref={ref}
        onScroll={sync}
        className="no-scrollbar overflow-x-auto scroll-smooth px-8"
      >
        <ul className="flex w-max gap-1.5">
          {CATEGORY_DEFS.map((c) => {
            const CIcon = ICONS[c.slug] ?? Package;
            const active = c.slug === current;
            return (
              <li key={c.slug}>
                <Link
                  to="/categoria/$slug"
                  params={{ slug: c.slug }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12px] font-semibold leading-none transition-colors",
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
      </div>

      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent transition-opacity",
          canPrev ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent transition-opacity",
          canNext ? "opacity-100" : "opacity-0",
        )}
      />
      <RailArrow side="left" onClick={() => scrollBy(-1)} disabled={!canPrev} />
      <RailArrow side="right" onClick={() => scrollBy(1)} disabled={!canNext} />
    </nav>
  );
}

function RailArrow({
  side,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Categorias anteriores" : "Próximas categorias"}
      className={cn(
        "absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition-opacity hover:border-brand-gold",
        side === "left" ? "left-0" : "right-0",
        disabled && "pointer-events-none opacity-0",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function Stat({
  label,
  value,
  align = "right",
}: {
  label: string;
  value: number;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "left" ? "text-left" : "text-right"}>
      <dt className="text-[9.5px] font-semibold uppercase leading-none tracking-[0.14em] text-white/60">
        {label}
      </dt>
      <dd className="mt-1 text-[15px] font-bold leading-none tabular-nums text-brand-gold">
        {value.toLocaleString("pt-BR")}
      </dd>
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
    <section
      className="mt-2.5 overflow-hidden rounded-xl border border-brand-gold/55 bg-brand-gold/10"
      aria-label="Plantão das farmácias"
    >
      <div className="flex flex-col gap-2 px-3 py-2.5 lg:flex-row lg:items-center lg:gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
          <span className="inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full bg-brand-gold px-2.5 text-[9.5px] font-bold uppercase leading-none tracking-[0.14em] text-brand-navy">
            <CalendarDays className="h-3 w-3" aria-hidden />
            Plantão{hoje ? ` · ${diaDaSemana(hoje)}` : ""}
          </span>
          <p className="min-w-0 truncate text-[13px] font-semibold leading-snug text-foreground">
            {f ? (
              <>
                {f.nome}
                <span className="font-normal text-muted-foreground">
                  {" — "}
                  {f.endereco}, {f.bairro}
                </span>
              </>
            ) : (
              "Consulte o calendário oficial do mês"
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {f?.telefones[0] && (
            <a
              href={`tel:${f.telefones[0].replace(/\D/g, "")}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[11.5px] font-semibold leading-none whitespace-nowrap text-foreground transition-colors hover:border-brand-gold"
            >
              <Phone className="h-3 w-3 text-brand-gold" aria-hidden /> {f.telefones[0]}
            </a>
          )}
          <Link
            to="/farmacias"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-gold px-3 text-[11.5px] font-bold leading-none whitespace-nowrap text-brand-navy transition-opacity hover:opacity-90"
          >
            Calendário completo <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      </div>
      {amanha && (
        <p className="border-t border-brand-gold/25 px-3 py-1.5 text-[11.5px] leading-snug text-muted-foreground">
          Amanhã: <strong className="font-semibold text-foreground">{amanha.nome}</strong> —{" "}
          {amanha.bairro}
        </p>
      )}
    </section>
  );

}
