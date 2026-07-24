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
  PageHeader,
  SectionCard,
  StatGrid,
  EmptyState,
  LoadingSkeleton,
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
      <mark className="rounded bg-primary/20 px-0.5 text-primary">
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
      toast.info("Entre na sua conta para favoritar bairros", {
        action: {
          label: "Entrar",
          onClick: () => {
            window.location.href = "/auth?redirect=" + encodeURIComponent("/mapa");
          },
        },
      });
      return;
    }
    toggleMutation.mutate({ key: name, name, city });
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <main className="mx-auto w-full max-w-4xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Início", to: "/" }, { label: "Mercados por bairro" }]}
          title="Mercados por bairro"
          description="Encontre os mercados cadastrados na sua região e favorite os seus."
        />

        {/* Barra de busca */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Buscar mercado por nome..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            data-no-translate
          />
          {term && (
            <button
              type="button"
              onClick={() => setTerm("")}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Seus bairros — atalho */}
        {isAuthed && favoriteGroups.length > 0 && !term && (
          <section className="mb-5">
            <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" /> Seus bairros
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {favoriteGroups.map((g) => (
                <a
                  key={g.neighborhood}
                  href={`#bairro-${encodeURIComponent(g.neighborhood)}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-[13px] font-semibold text-primary hover:bg-primary/10"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  {g.neighborhood}
                  <span className="rounded-full bg-primary/15 px-1.5 text-[13px]">
                    {g.establishments.length}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {groups.isLoading && <LoadingSkeleton rows={4} />}

        {groups.error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-[14px] text-destructive">
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
          <>
            <StatGrid
              className="mb-4 sm:grid-cols-2 lg:grid-cols-2"
              stats={[
                {
                  label: term ? "Bairros com resultado" : "Bairros",
                  value: filteredGroups.length,
                  icon: MapPin,
                  tone: "primary",
                },
                { label: "Mercados", value: totalMarkets, icon: Store },
              ]}
            />

            <div className="space-y-4">
              {filteredGroups.map((group) => {
                const isFav = favKeys.has(group.neighborhood);
                return (
                  <section
                    key={group.neighborhood}
                    id={`bairro-${encodeURIComponent(group.neighborhood)}`}
                    className="overflow-hidden rounded-2xl border border-border bg-card scroll-mt-4"
                  >
                    <header className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <div>
                          <h2 className="text-sm font-semibold text-foreground">
                            {group.neighborhood}
                          </h2>
                          {group.city && (
                            <p className="text-[10px] text-muted-foreground">
                              {group.city}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {group.establishments.length}{" "}
                          {group.establishments.length === 1 ? "mercado" : "mercados"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleFavClick(group.neighborhood, group.city)
                          }
                          aria-label={
                            isFav ? "Remover dos favoritos" : "Favoritar bairro"
                          }
                          aria-pressed={isFav}
                          className={
                            "rounded-full p-1.5 transition-colors " +
                            (isFav
                              ? "text-primary hover:text-primary/80"
                              : "text-muted-foreground hover:text-foreground")
                          }
                        >
                          <Star
                            className={"h-4 w-4 " + (isFav ? "fill-primary" : "")}
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>
                    </header>

                    {/* Insights — categorias e top produtos */}
                    {(group.topCategories.length > 0 || group.topProducts.length > 0) && (
                      <div className="space-y-2 border-b border-border bg-muted/10 px-4 py-3">
                        {group.topCategories.length > 0 && (
                          <div>
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <Tag className="h-3 w-3" /> Categorias mais cadastradas
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {group.topCategories.map((c) => (
                                <span
                                  key={c.name}
                                  className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground"
                                >
                                  {c.name}
                                  <span className="ml-1 text-muted-foreground">
                                    {c.count}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {group.topProducts.length > 0 && (
                          <div>
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                                  <span className="shrink-0 font-semibold text-primary">
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
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background"
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
                              <Store className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {highlight(est.name, term)}
                            </p>
                            {est.address && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {est.address}
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            <Package className="h-3 w-3" />
                            {est.productsCount}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
