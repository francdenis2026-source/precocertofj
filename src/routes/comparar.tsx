import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Nav } from "@/components/brand/Nav";
import { Footer } from "@/components/brand/Footer";
import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { ProductImage } from "@/components/product/ProductImage";
import { useSignedLogoUrls } from "@/hooks/use-signed-logo-urls";
import { shortenStoreName } from "@/lib/store-name";
import {
  ErrorState,
  EmptyState,
  LoadingGrid,
} from "@/components/feedback";
import {
  ArrowLeft,
  Trophy,
  X,
  Store as StoreIcon,
  Plus,
  TrendingDown,
} from "lucide-react";

const searchSchema = z.object({
  ids: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/comparar")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Comparar produtos lado a lado — PreçoCerto" },
      {
        name: "description",
        content:
          "Compare até 3 variações de produtos e seus estabelecimentos lado a lado, com preço, economia e mercado mais barata.",
      },
      { property: "og:title", content: "Comparar produtos lado a lado — PreçoCerto" },
      {
        property: "og:description",
        content: "Escolha até 3 opções e veja preços e mercados na mesma tela.",
      },
    ],
  }),
  component: CompararPage,
});

type StoreEntry = {
  establishment_id: string;
  store_name: string;
  price: number;
  product_name: string;
};

type Comparison = {
  product_key: string;
  display_name: string;
  category: string;
  size_value: number | null;
  size_unit: string;
  store_count: number;
  min_price: number;
  avg_price: number;
  max_price: number;
  savings_pct: number;
  cheapest_store: string;
  cheapest_establishment_id: string;
  image_url: string | null;
  catalog_slug: string | null;
  stores: StoreEntry[];
};

const fmt = (n: number | null | undefined) =>
  typeof n === "number"
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";

function formatSize(size_value: number | null, size_unit: string): string | null {
  if (size_value == null) return null;
  if (size_unit === "g" && size_value >= 1000)
    return `${(size_value / 1000).toLocaleString("pt-BR")} kg`;
  if (size_unit === "ml" && size_value >= 1000)
    return `${(size_value / 1000).toLocaleString("pt-BR")} L`;
  return `${size_value.toLocaleString("pt-BR")} ${size_unit}`;
}

const MAX = 3;

function CompararPage() {
  const search = Route.useSearch();
  const ids: string = (search as { ids?: string }).ids ?? "";
  const navigate = useNavigate({ from: "/comparar" });

  const selectedKeys = useMemo<string[]>(
    () =>
      ids
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .slice(0, MAX),
    [ids],
  );


  const { data, isLoading, error } = useQuery({
    queryKey: ["price-comparisons-all"],
    queryFn: async (): Promise<Comparison[]> => {
      const { data, error } = await supabase.rpc("get_price_comparisons");
      if (error) throw error;
      return (data as unknown as Comparison[]) ?? [];
    },
    staleTime: 60_000,
  });

  const allRows: Comparison[] = data ?? [];

  const selectedRows = useMemo(() => {
    const map = new Map(allRows.map((r) => [r.product_key, r]));
    return selectedKeys
      .map((k) => map.get(k))
      .filter((r): r is Comparison => !!r);
  }, [allRows, selectedKeys]);

  const remove = (key: string) => {
    const next = selectedKeys.filter((k) => k !== key);
    navigate({ search: { ids: next.join(",") } });
  };

  const signedImages = useSignedLogoUrls(
    useMemo(() => selectedRows.map((r) => r.image_url), [selectedRows]),
  );

  // Union of all stores across selected products, sorted by name.
  const storeUnion = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of selectedRows) {
      for (const s of r.stores) {
        map.set(s.establishment_id, s.store_name);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [selectedRows]);

  // Best (lowest) price per store across the selected products.
  const bestByStore = useMemo(() => {
    const best = new Map<string, { key: string; price: number }>();
    for (const r of selectedRows) {
      for (const s of r.stores) {
        const cur = best.get(s.establishment_id);
        if (!cur || Number(s.price) < cur.price) {
          best.set(s.establishment_id, {
            key: r.product_key,
            price: Number(s.price),
          });
        }
      }
    }
    return best;
  }, [selectedRows]);

  // Absolute cheapest of the whole comparison
  const absoluteMin = useMemo(() => {
    let min = Infinity;
    let key: string | null = null;
    for (const r of selectedRows) {
      const p = Number(r.min_price);
      if (p < min) {
        min = p;
        key = r.product_key;
      }
    }
    return { price: min === Infinity ? null : min, key };
  }, [selectedRows]);

  return (
    <div className="min-h-screen">
      <Nav />
      <Breadcrumbs
        items={[
          { label: "Comparador", to: "/comparador" },
          { label: "Lado a lado" },
        ]}
      />

      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Comparação lado a lado
              </p>
              <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-foreground md:text-4xl">
                {selectedRows.length}/{MAX} produtos comparados
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Escolha até {MAX} variações no comparador e veja preços,
                estabelecimentos e economia lado a lado.
              </p>
            </div>
            <Link
              to="/comparador"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao comparador
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {isLoading && <LoadingGrid count={3} columns={3} />}

        {!isLoading && error && (
          <ErrorState
            title="Não foi possível carregar os produtos"
            message={(error as Error).message}
            onRetry={() => window.location.reload()}
          />
        )}

        {!isLoading && !error && selectedRows.length === 0 && (
          <EmptyState
            icon={StoreIcon}
            title="Nenhum produto selecionado"
            message="Volte ao comparador e escolha até 3 produtos para colocar lado a lado."
            action={
              <Link
                to="/comparador"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
              >
                Ir para o comparador
              </Link>
            }
          />
        )}

        {!isLoading && !error && selectedRows.length > 0 && (
          <>
            {/* Product cards row */}
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${Math.max(selectedRows.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {selectedRows.map((r, idx) => {
                const isCheapest = r.product_key === absoluteMin.key;
                const size = formatSize(r.size_value, r.size_unit);
                const img = r.image_url ? signedImages[r.image_url] : undefined;
                const ordinal = String(idx + 1).padStart(2, "0");
                return (
                  <article
                    key={r.product_key}
                    className={
                      "relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition " +
                      (isCheapest
                        ? "border-savings/60 ring-2 ring-savings/25"
                        : "border-border")
                    }
                  >
                    <div className="hairline-gold h-[2px] w-full" aria-hidden />

                    <button
                      type="button"
                      onClick={() => remove(r.product_key)}
                      aria-label={`Remover ${r.display_name}`}
                      className="absolute right-2 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-background/90 text-muted-foreground shadow-sm backdrop-blur transition hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </button>

                    <div className="flex items-center justify-between px-4 pt-3">
                      <span className="font-display text-[13px] italic tracking-tight text-accent">
                        N.º {ordinal}
                      </span>
                      {isCheapest && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-savings px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-savings-foreground shadow-sm">
                          <Trophy className="h-3 w-3" strokeWidth={2.6} />
                          Melhor
                        </span>
                      )}
                    </div>

                    <div className="aspect-[4/3] bg-gradient-to-br from-muted/60 to-background">
                      <ProductImage
                        src={img ?? r.image_url}
                        alt={r.display_name}
                        className="h-full w-full"
                        imageClassName="h-full w-full"
                        fit="contain"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex flex-col gap-2 p-4">
                      {r.category && (
                        <p className="font-display text-[11px] italic tracking-wide text-accent">
                          {r.category}
                        </p>
                      )}
                      <h2 className="line-clamp-2 font-display text-[16px] font-semibold leading-snug tracking-tight text-foreground">
                        {r.display_name}
                        {size && (
                          <span className="ml-1 font-display text-[13px] font-normal italic text-muted-foreground">
                            · {size}
                          </span>
                        )}
                      </h2>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                          <StoreIcon className="h-3 w-3" />
                          {r.store_count} estabelecimento{Number(r.store_count) !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="mt-1 pt-2">
                        <div className="hairline-gold mb-2 h-px w-full" aria-hidden />
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
                          Menor · preço
                        </p>
                        <p className="num font-display text-3xl font-extrabold tracking-tight text-primary">
                          {fmt(Number(r.min_price))}
                        </p>
                        <p className="mt-0.5 truncate font-display text-[12px] italic text-muted-foreground">
                          em{" "}
                          <span className="font-medium not-italic text-foreground">
                            {shortenStoreName(r.cheapest_store)}
                          </span>
                        </p>
                        {Number(r.store_count) > 1 && (
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                            <TrendingDown className="h-3 w-3 text-savings" />
                            até -{Number(r.savings_pct).toFixed(0)}% vs. mais caro
                          </p>
                        )}
                      </div>

                      <Link
                        to="/produto-publico/$slug"
                        params={{ slug: r.catalog_slug ?? r.display_name }}
                        className="mt-1 inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-1.5 text-[11.5px] font-semibold text-foreground transition hover:border-accent/50 hover:text-accent"
                      >
                        Ver detalhes
                      </Link>
                    </div>
                  </article>
                );
              })}

              {selectedRows.length < MAX && (
                <Link
                  to="/comparador"
                  className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/50 p-6 text-center text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="h-6 w-6" strokeWidth={2} />
                  <p className="text-[12.5px] font-semibold">
                    Adicionar mais um produto
                  </p>
                  <p className="text-[11px]">
                    {MAX - selectedRows.length} slot
                    {MAX - selectedRows.length > 1 ? "s" : ""} restante
                    {MAX - selectedRows.length > 1 ? "s" : ""}
                  </p>
                </Link>
              )}
            </div>

            {/* Attribute matrix */}
            <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Atributo</th>
                    {selectedRows.map((r) => (
                      <th
                        key={r.product_key}
                        className="px-4 py-3 font-semibold text-foreground"
                      >
                        {r.display_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <MatrixRow
                    label="Menor preço"
                    values={selectedRows.map((r) => ({
                      key: r.product_key,
                      content: (
                        <span
                          className={
                            "num font-bold " +
                            (r.product_key === absoluteMin.key
                              ? "text-savings"
                              : "text-foreground")
                          }
                        >
                          {fmt(Number(r.min_price))}
                        </span>
                      ),
                    }))}
                  />
                  <MatrixRow
                    label="Preço médio"
                    values={selectedRows.map((r) => ({
                      key: r.product_key,
                      content: (
                        <span className="num">{fmt(Number(r.avg_price))}</span>
                      ),
                    }))}
                  />
                  <MatrixRow
                    label="Maior preço"
                    values={selectedRows.map((r) => ({
                      key: r.product_key,
                      content: (
                        <span className="num text-muted-foreground">
                          {fmt(Number(r.max_price))}
                        </span>
                      ),
                    }))}
                  />
                  <MatrixRow
                    label="Economia máx."
                    values={selectedRows.map((r) => ({
                      key: r.product_key,
                      content: (
                        <span className="font-semibold text-savings">
                          {Number(r.store_count) > 1
                            ? `-${Number(r.savings_pct).toFixed(0)}%`
                            : "—"}
                        </span>
                      ),
                    }))}
                  />
                  <MatrixRow
                    label="Mercado mais barata"
                    values={selectedRows.map((r) => ({
                      key: r.product_key,
                      content: (
                        <span className="truncate text-foreground" title={r.cheapest_store}>
                          {shortenStoreName(r.cheapest_store)}
                        </span>
                      ),
                    }))}
                  />
                  <MatrixRow
                    label="Estabelecimentos"
                    values={selectedRows.map((r) => ({
                      key: r.product_key,
                      content: (
                        <span className="num">{r.store_count}</span>
                      ),
                    }))}
                  />
                  <MatrixRow
                    label="Tamanho"
                    values={selectedRows.map((r) => ({
                      key: r.product_key,
                      content: (
                        <span className="text-foreground">
                          {formatSize(r.size_value, r.size_unit) ?? "—"}
                        </span>
                      ),
                    }))}
                  />
                  <MatrixRow
                    label="Categoria"
                    values={selectedRows.map((r) => ({
                      key: r.product_key,
                      content: (
                        <span className="text-muted-foreground">
                          {r.category || "—"}
                        </span>
                      ),
                    }))}
                  />
                </tbody>
              </table>
            </div>

            {/* Store-by-store matrix */}
            {storeUnion.length > 0 && (
              <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-3">
                  <StoreIcon className="h-4 w-4 text-primary" strokeWidth={2.2} />
                  <p className="text-[11px] font-black uppercase tracking-widest text-foreground">
                    Preço em cada estabelecimento
                  </p>
                </div>
                <table className="w-full min-w-[600px] border-collapse text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-widest text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 font-semibold">Mercado</th>
                      {selectedRows.map((r) => (
                        <th
                          key={r.product_key}
                          className="px-4 py-2.5 font-semibold text-foreground"
                        >
                          <span className="line-clamp-1">{r.display_name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {storeUnion.map((store) => (
                      <tr key={store.id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 text-[13px] font-medium text-foreground">
                          <span title={store.name}>
                            {shortenStoreName(store.name)}
                          </span>
                        </td>
                        {selectedRows.map((r) => {
                          const entry = r.stores.find(
                            (s) => s.establishment_id === store.id,
                          );
                          const isBest =
                            !!entry &&
                            bestByStore.get(store.id)?.key === r.product_key;
                          return (
                            <td
                              key={r.product_key}
                              className={
                                "px-4 py-2.5 " +
                                (isBest ? "bg-savings/[0.08]" : "")
                              }
                            >
                              {entry ? (
                                <span
                                  className={
                                    "num inline-flex items-center gap-1 text-[13px] " +
                                    (isBest
                                      ? "font-bold text-savings"
                                      : "text-foreground")
                                  }
                                >
                                  {isBest && (
                                    <Trophy
                                      className="h-3 w-3"
                                      strokeWidth={2.6}
                                    />
                                  )}
                                  {fmt(Number(entry.price))}
                                </span>
                              ) : (
                                <span className="text-[12px] text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}

function MatrixRow({
  label,
  values,
}: {
  label: string;
  values: Array<{ key: string; content: React.ReactNode }>;
}) {
  return (
    <tr>
      <td className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </td>
      {values.map((v) => (
        <td key={v.key} className="px-4 py-2.5 text-[13px]">
          {v.content}
        </td>
      ))}
    </tr>
  );
}
