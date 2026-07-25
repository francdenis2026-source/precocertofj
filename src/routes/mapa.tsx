import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  MapPin,
  Store,
  Package,
  Search,
  Star,
  X,
  Tag,
  TrendingUp,
} from "lucide-react";
import { listEstablishmentsByNeighborhood } from "@/lib/scans-history.functions";
import {
  listFavoriteNeighborhoods,
  toggleFavoriteNeighborhood,
} from "@/lib/favorites-neighborhoods.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import { usePromptSignIn } from "@/components/auth/usePromptSignIn";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";
import {
  InternalPageHeader,
  EmptyState,
  LoadingSkeleton,
  SiteFooter,
} from "@/components/layout";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mercados por bairro — PreçoCerto" },
      {
        name: "description",
        content:
          "Veja os mercados cadastrados organizados por bairro, favorite os seus e compare preços rapidamente.",
      },
      { property: "og:title", content: "Mercados por bairro — PreçoCerto" },
      {
        property: "og:description",
        content: "Encontre os mercados mais próximos organizados por bairro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NeighborhoodsPage,
});

function currency(v: number | null): string {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function highlight(text: string, term: string) {
  if (!term.trim()) return text;
  const idx = text.toLocaleLowerCase("pt-BR").indexOf(term.toLocaleLowerCase("pt-BR"));
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-brand-gold/25 px-0.5 text-brand-navy dark:text-brand-gold">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

function NeighborhoodsPage() {
  const fetchNeighborhoods = useServerFn(listEstablishmentsByNeighborhood);
  const fetchFavs = useServerFn(listFavoriteNeighborhoods);
  const toggleFav = useServerFn(toggleFavoriteNeighborhood);
  const queryClient = useQueryClient();
  const { session, loading: sessionLoading } = useSession();
  const isAuthed = !sessionLoading && !!session;
  const promptSignIn = usePromptSignIn();

  const [term, setTerm] = useState("");

  const groups = useQuery({
    queryKey: ["neighborhoods"],
    queryFn: () => fetchNeighborhoods({}),
    staleTime: 60_000,
  });

  const favs = useQuery({
    queryKey: ["favorite-neighborhoods"],
    queryFn: () => fetchFavs({}),
    enabled: isAuthed,
    staleTime: 30_000,
  });

  const favKeys = useMemo(
    () => new Set((favs.data ?? []).map((f) => f.key)),
    [favs.data],
  );

  const toggleMutation = useMutation({
    mutationFn: (v: { key: string; name: string; city: string | null }) =>
      toggleFav({ data: v }),
    onMutate: async (v) => {
      await queryClient.cancelQueries({ queryKey: ["favorite-neighborhoods"] });
      const prev = queryClient.getQueryData<
        Array<{ id: string; key: string; name: string; city: string | null }>
      >(["favorite-neighborhoods"]);
      const isFav = prev?.some((p) => p.key === v.key);
      const next = isFav
        ? (prev ?? []).filter((p) => p.key !== v.key)
        : [{ id: "optimistic-" + v.key, ...v }, ...(prev ?? [])];
      queryClient.setQueryData(["favorite-neighborhoods"], next);
      return { prev };
    },
    onError: (err, _v, ctx) => {
      queryClient.setQueryData(["favorite-neighborhoods"], ctx?.prev);
      toast.error((err as Error).message || "Não foi possível atualizar o favorito");
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["favorite-neighborhoods"] });
      toast.success(res.favored ? "Bairro favoritado" : "Bairro removido dos favoritos");
    },
  });

  const filteredGroups = useMemo(() => {
    const data = groups.data ?? [];
    const q = term.trim().toLocaleLowerCase("pt-BR");
    if (!q) return data;
    return data
      .map((g) => ({
        ...g,
        establishments: g.establishments.filter((e) =>
          e.name.toLocaleLowerCase("pt-BR").includes(q),
        ),
      }))
      .filter((g) => g.establishments.length > 0);
  }, [groups.data, term]);

  const totalMarkets =
    filteredGroups.reduce((n, g) => n + g.establishments.length, 0) ?? 0;

  const favoriteGroups = useMemo(() => {
    if (!favs.data || favs.data.length === 0) return [];
    const byKey = new Map(
      (groups.data ?? []).map((g) => [g.neighborhood, g] as const),
    );
    return favs.data
      .map((f) => byKey.get(f.name))
      .filter((g): g is NonNullable<typeof g> => !!g);
  }, [favs.data, groups.data]);

  const handleFavClick = (name: string, city: string | null) => {
    if (!isAuthed) {
      void promptSignIn({
        intent: "favorite-district",
        payload: { name, city },
        returnTo: "/mapa",
      });
      return;
    }
    toggleMutation.mutate({ key: name, name, city });
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <main className="mx-auto w-full max-w-4xl px-4 pt-4 md:px-6 md:pt-6">
        <InternalPageHeader
          breadcrumbs={[
            { label: "Início", to: "/" },
            { label: "Mercados por bairro" },
          ]}
          title="Mercados por bairro"
          highlight="bairro"
          description="Encontre os mercados cadastrados na sua região e favorite os seus."
          actions={
            filteredGroups.length > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-gold">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {filteredGroups.length} {filteredGroups.length === 1 ? "bairro" : "bairros"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">
                  <Store className="h-3 w-3" aria-hidden />
                  {totalMarkets} {totalMarkets === 1 ? "mercado" : "mercados"}
                </span>
              </div>
            ) : null
          }
        />

        {/* Barra de busca — compacta, focus dourado */}
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm transition-colors focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/30">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar mercado por nome…"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            data-no-translate
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              className="rounded-full p-1 text-muted-foreground transition-colors hover:text-brand-gold"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Seus bairros — atalho gold */}
        {isAuthed && favoriteGroups.length > 0 && !term && (
          <section className="mb-4">
            <h2 className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-brand-gold text-brand-gold" /> Seus bairros
            </h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {favoriteGroups.map((g) => (
                <a
                  key={g.neighborhood}
                  href={`#bairro-${encodeURIComponent(g.neighborhood)}`}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/10 px-3 py-1 text-[12px] font-semibold text-brand-gold transition-colors hover:border-brand-gold hover:bg-brand-gold hover:text-brand-navy"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {g.neighborhood}
                  <span className="rounded-full bg-brand-gold/20 px-1.5 text-[11px] font-bold tabular-nums">
                    {g.establishments.length}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {groups.isLoading && <LoadingSkeleton rows={4} />}

        {groups.error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-[13.5px] text-destructive">
            Não foi possível carregar os bairros: {(groups.error as Error).message}
          </div>
        )}

        {groups.data && filteredGroups.length === 0 && !groups.isLoading && (
          <EmptyState
            icon={MapPin}
            title={term ? "Nenhum mercado encontrado" : "Nenhum bairro cadastrado ainda"}
            description={
              term
                ? `Nenhum resultado para "${term}". Tente outro nome.`
                : "Assim que houver mercados cadastrados, eles aparecerão aqui."
            }
          />
        )}

        {filteredGroups.length > 0 && (
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const isFav = favKeys.has(group.neighborhood);
              return (
                <section
                  key={group.neighborhood}
                  id={`bairro-${encodeURIComponent(group.neighborhood)}`}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm scroll-mt-4 transition-colors hover:border-brand-gold/40"
                >
                  {/* Header do bairro — faixa dourada lateral + tipografia clean */}
                  <header className="relative flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-3.5 py-2.5 pl-4">
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-[3px] bg-brand-gold"
                    />
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-gold/15 text-brand-gold">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-[13.5px] font-bold tracking-tight text-foreground">
                          {group.neighborhood}
                        </h2>
                        {group.city && (
                          <p className="truncate text-[10.5px] text-muted-foreground">
                            {group.city}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded-full border border-brand-gold/40 bg-brand-gold/10 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-brand-gold">
                        {group.establishments.length}{" "}
                        {group.establishments.length === 1 ? "mercado" : "mercados"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFavClick(group.neighborhood, group.city)}
                        aria-label={isFav ? "Remover dos favoritos" : "Favoritar bairro"}
                        aria-pressed={isFav}
                        className={
                          "rounded-full p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold " +
                          (isFav
                            ? "text-brand-gold hover:text-brand-gold/80"
                            : "text-muted-foreground hover:text-brand-gold")
                        }
                      >
                        <Star
                          className={"h-4 w-4 " + (isFav ? "fill-brand-gold" : "")}
                          strokeWidth={1.75}
                        />
                      </button>
                    </div>
                  </header>

                  {/* Insights — categorias e top produtos */}
                  {(group.topCategories.length > 0 || group.topProducts.length > 0) && (
                    <div className="space-y-2.5 border-b border-border bg-muted/10 px-3.5 py-2.5">
                      {group.topCategories.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            <Tag className="h-3 w-3" /> Categorias mais cadastradas
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {group.topCategories.map((c) => (
                              <span
                                key={c.name}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground"
                              >
                                {c.name}
                                <span className="rounded-full bg-brand-gold/15 px-1.5 text-[10px] font-bold text-brand-gold tabular-nums">
                                  {c.count}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {group.topProducts.length > 0 && (
                        <div>
                          <div className="mb-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            <TrendingUp className="h-3 w-3" /> Mais encontrados no bairro
                          </div>
                          <ul className="space-y-0.5">
                            {group.topProducts.map((p) => (
                              <li
                                key={p.name}
                                className="flex items-center justify-between gap-2 text-[12px]"
                              >
                                <span className="min-w-0 flex-1 truncate text-foreground">
                                  {p.name}
                                </span>
                                <span className="shrink-0 font-bold tabular-nums text-brand-gold">
                                  {currency(p.minPrice)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  <ul className="divide-y divide-border">
                    {group.establishments.map((est) => (
                      <li
                        key={est.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <div
                          className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background"
                          style={{
                            backgroundColor: est.brandColor ?? undefined,
                          }}
                        >
                          {est.logoUrl ? (
                            <img
                              src={est.logoUrl}
                              alt={est.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <Store className="h-4.5 w-4.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-foreground">
                            {highlight(est.name, term)}
                          </p>
                          {est.address && (
                            <p className="truncate text-[11px] text-muted-foreground">
                              {est.address}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10.5px] font-bold text-foreground">
                          <Package className="h-3 w-3 text-brand-gold" />
                          <span className="tabular-nums">{est.productsCount}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
      <MobileNav />
    </div>
  );
}
