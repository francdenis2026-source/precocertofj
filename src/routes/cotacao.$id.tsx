import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown, ShoppingBag, Scale } from "lucide-react";
import { getPublicStoreQuote } from "@/lib/store-quotes.functions";
import { exportStoreQuotePdf } from "@/lib/store-quote-pdf";
import { cn } from "@/lib/utils";

const quoteQuery = (id: string) =>
  queryOptions({
    queryKey: ["public-store-quote", id],
    queryFn: () => getPublicStoreQuote({ data: { id } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/cotacao/$id")({
  loader: async ({ context, params }) => {
    const q = await context.queryClient.ensureQueryData(quoteQuery(params.id));
    if (!q) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: "Cotação de cesta — PreçoCerto" },
      {
        name: "description",
        content: "Comparação de preços de uma cesta entre mercados na plataforma PreçoCerto.",
      },
      { property: "og:title", content: "Cotação de cesta — PreçoCerto" },
      {
        property: "og:description",
        content: "Veja o total dessa cesta e como ela se compara em outros mercados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
      { key: "canonical", rel: "canonical", href: `/cotacao/${params.id}` } as never,
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm text-muted-foreground">
        Cotação não encontrada ou não está mais pública.
      </p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
        Voltar para a home
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Erro ao carregar cotação"}
      </p>
      <Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
        Voltar
      </Link>
    </div>
  ),
  component: PublicQuotePage,
});

const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

function PublicQuotePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(quoteQuery(id));
  if (!data) return null;

  const ref = data.comparison?.find((r) => r.isReference);
  const refTotal = ref?.total ?? data.total;

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/cotacao/${data.id}` : null;

  return (
    <div className="min-h-[100svh] bg-background pb-12 text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>

        <header className="mt-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
            Cotação de cesta
          </p>
          <h1 className="mt-1 font-display text-[22px] font-bold leading-tight text-foreground">
            {data.storeName}
          </h1>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Gerada em {new Date(data.createdAt).toLocaleString("pt-BR")}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Itens
              </p>
              <p className="num mt-0.5 font-display text-[16px] font-bold text-foreground">
                {data.itemCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/60 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Total nesta mercado
              </p>
              <p className="num mt-0.5 font-display text-[16px] font-bold text-primary">
                {fmt(data.total)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              exportStoreQuotePdf({
                storeName: data.storeName,
                cart: data.cart,
                comparison: data.comparison,
                shareUrl,
              })
            }
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            <FileDown className="h-4 w-4" /> Baixar PDF
          </button>
        </header>

        <section className="mt-5 rounded-2xl border border-border bg-surface shadow-sm">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <h2 className="font-display text-[14px] font-bold text-foreground">Itens</h2>
          </header>
          <ul className="divide-y divide-border">
            {data.cart.map((it) => (
              <li key={it.slug} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-foreground">
                    {it.productName}
                  </p>
                  <p className="num text-[11px] text-muted-foreground">
                    {fmt(it.price)} × {it.quantity}
                  </p>
                </div>
                <span className="num shrink-0 font-display text-[13px] font-bold text-foreground">
                  {fmt(it.price * it.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {data.comparison && data.comparison.length > 0 && (
          <section className="mt-5 rounded-2xl border border-border bg-surface shadow-sm">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Scale className="h-4 w-4 text-primary" />
              <h2 className="font-display text-[14px] font-bold text-foreground">
                Comparação entre mercados
              </h2>
            </header>
            <ul className="divide-y divide-border">
              {data.comparison.map((r) => {
                const diff = r.total - refTotal;
                const pct = refTotal > 0 ? (diff / refTotal) * 100 : 0;
                const cheaper = diff < 0;
                return (
                  <li key={r.storeId} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-foreground">
                        {r.storeName}
                        {r.isReference && (
                          <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-[1px] text-[11px] font-bold uppercase tracking-wider text-primary">
                            atual
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.matchedCount}/{r.totalCount} itens
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          "num font-display text-[14px] font-bold",
                          cheaper && !r.isReference
                            ? "text-savings dark:text-savings"
                            : "text-foreground",
                        )}
                      >
                        {fmt(r.total)}
                      </p>
                      {!r.isReference && (
                        <p
                          className={cn(
                            "num text-[11px] font-semibold",
                            cheaper
                              ? "text-savings dark:text-savings"
                              : diff > 0
                                ? "text-destructive"
                                : "text-muted-foreground",
                          )}
                        >
                          {cheaper ? "▼" : diff > 0 ? "▲" : "="}{" "}
                          {Math.abs(pct).toFixed(1).replace(".", ",")}%
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Sistema de pesquisa de preços — não realizamos pagamentos.
        </p>
      </div>
    </div>
  );
}
