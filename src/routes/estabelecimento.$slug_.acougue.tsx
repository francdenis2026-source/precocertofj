import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
  stripSearchParams,
} from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";
import { ArrowLeft, Beef, MapPin, Store } from "lucide-react";
import { getPublicStoreCatalog, type PublicStoreProduct } from "@/lib/stores-public.functions";
import { ProductQuickView } from "@/components/product/ProductQuickView";
import { resolveEstablishmentBySlug } from "@/lib/establishment-slug.functions";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  ButcherCounter,
  splitButcherCuts,
  parseButcherState,
  type ButcherViewState,
} from "@/components/estabelecimento/ButcherCounter";
import { PreparoDicas } from "@/components/estabelecimento/PreparoDicas";
import { EmptyState, LoadingGrid, RouteError } from "@/components/feedback";

const storeQuery = (id: string) =>
  queryOptions({
    queryKey: ["public-store", id],
    queryFn: () => getPublicStoreCatalog({ data: { id } }),
    staleTime: 60_000,
  });

const SEARCH_DEFAULTS = { bq: "", prot: "", bsort: "kg-asc", bview: "grid", p: "" };

const searchSchema = z.object({
  bq: fallback(z.string(), "").default(""),
  prot: fallback(z.string(), "").default(""),
  bsort: fallback(z.string(), "kg-asc").default("kg-asc"),
  bview: fallback(z.string(), "grid").default("grid"),
  /** Slug do corte aberto no modal — permite compartilhar link direto. */
  p: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/estabelecimento/$slug_/acougue")({
  validateSearch: zodValidator(searchSchema),
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  loader: async ({ params, context }) => {
    const match = await resolveEstablishmentBySlug({ data: { slug: params.slug } });
    if (!match) throw notFound();
    await context.queryClient.ensureQueryData(storeQuery(match.id));
    return { storeId: match.id, slug: match.slug };
  },
  head: ({ params }) => {
    const pretty = params.slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `Açougue do ${pretty} — Preço por kg dos cortes | PreçoCerto Feijó` },
        {
          name: "description",
          content: `Cortes de balcão do açougue interno do ${pretty} em Feijó/AC: bovino, frango e suíno com preço por quilo e dicas de preparo.`,
        },
        { property: "og:title", content: `Açougue do ${pretty} — cortes e preços por kg` },
        {
          property: "og:description",
          content: `Compare o preço por quilo dos cortes do açougue do ${pretty} em Feijó/AC.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  errorComponent: ({ error, reset }) => (
    <RouteError
      title="Não foi possível carregar o açougue"
      message={error instanceof Error ? error.message : "Tente novamente em instantes."}
      onRetry={() => reset()}
    />
  ),
  notFoundComponent: () => (
    <div className="mx-auto flex min-h-[50dvh] max-w-md flex-col items-center justify-center px-4 text-center">
      <Store className="mb-2 h-8 w-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Estabelecimento não encontrado</h2>
      <Link to="/estabelecimentos" className="mt-4 text-sm text-primary hover:underline">
        Voltar para os mercados
      </Link>
    </div>
  ),
  pendingComponent: () => (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <LoadingGrid count={6} columns={3} />
    </div>
  ),
  component: ButcherPage,
});

function ButcherPage() {
  const { storeId, slug } = Route.useLoaderData();
  const { data } = useSuspenseQuery(storeQuery(storeId));
  const { cuts } = useMemo(() => splitButcherCuts(data.products), [data.products]);
  const navigate = useNavigate();
  const search = Route.useSearch();
  // Corte aberto vem da URL: recarregar/compartilhar reabre o mesmo produto.
  const quickView = useMemo<PublicStoreProduct | null>(
    () => (search.p ? (cuts.find((c) => c.slug === search.p) ?? null) : null),
    [cuts, search.p],
  );

  const butcherState = useMemo(
    () => parseButcherState({ q: search.bq, prot: search.prot, bsort: search.bsort, bview: search.bview }),
    [search.bq, search.prot, search.bsort, search.bview],
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(butcherState);
  stateRef.current = butcherState;
  // Callback estável: alternar Grade/Lista e categorias não recria o balcão.
  const patchButcher = useCallback((patch: Partial<ButcherViewState>) => {
    const next = { ...stateRef.current, ...patch };
    const apply = () =>
      navigate({
        to: "/estabelecimento/$slug_/acougue",
        params: { slug },
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          bq: next.q,
          prot: next.protein ?? "",
          bsort: next.sort,
          bview: next.view,
        }),
        replace: patch.q !== undefined,
      });
    if (timer.current) clearTimeout(timer.current);
    if (patch.q !== undefined) timer.current = setTimeout(apply, 350);
    else apply();
  }, [navigate, slug]);

  const openQuickView = useCallback(
    (product: PublicStoreProduct) => {
      navigate({
        to: "/estabelecimento/$slug_/acougue",
        params: { slug },
        search: (prev: Record<string, unknown>) => ({ ...prev, p: product.slug }),
      });
    },
    [navigate, slug],
  );
  const closeQuickView = useCallback(() => {
    navigate({
      to: "/estabelecimento/$slug_/acougue",
      params: { slug },
      search: (prev: Record<string, unknown>) => ({ ...prev, p: "" }),
      replace: true,
    });
  }, [navigate, slug]);


  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <Link
          to="/estabelecimento/$slug"
          params={{ slug }}
          className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3.5 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-brand-gold hover:bg-[var(--pc-hover-tint)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Voltar para {data.store.name}
        </Link>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
          {data.store.neighborhood && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-brand-gold" aria-hidden /> Bairro{" "}
              {data.store.neighborhood}
            </span>
          )}
          {data.store.address && <span>{data.store.address}</span>}
        </div>

        {cuts.length > 0 ? (
          <>
            <ButcherCounter
              storeName={data.store.name}
              cuts={cuts}
              state={butcherState}
              onStateChange={patchButcher}
              onOpen={openQuickView}
            />
            <div className="mt-8">
              <PreparoDicas />
            </div>
          </>

        ) : (
          <EmptyState
            className="mt-10"
            icon={Beef}
            title="Este estabelecimento ainda não tem açougue publicado"
            message="Nenhum corte de balcão foi cadastrado até agora."
          />
        )}

        <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground">
          O açougue é um setor interno do estabelecimento{" "}
          <strong className="text-foreground">{data.store.name}</strong> — não é um comércio
          separado e não é contabilizado como novo estabelecimento na plataforma.
        </p>
      </main>
      <ProductQuickView
        product={
          quickView
            ? {
                name: quickView.productName,
                unit: quickView.unitLabel,
                minPrice: quickView.price,
                maxPrice: quickView.price,
                cheapestStore: data.store.name,
                storeCount: 1,
                updatedAt: quickView.lastDate,
              }
            : null
        }
        onClose={closeQuickView}
      />
      <SiteFooter />
    </div>
  );
}
