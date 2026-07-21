import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { MobileNav } from "@/components/nav/MobileNav";
import { ProductImage } from "@/components/product/ProductImage";
import { ArrowLeft, ShoppingBag, Trash2, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getCart, removeFromCart, type Cart } from "@/lib/cart.functions";

export const Route = createFileRoute("/cesta")({
  head: () => ({
    meta: [
      { title: "Minha cesta — PreçoCerto" },
      {
        name: "description",
        content: "Produtos que você adicionou à cesta para comparar preços.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <ProtectedGate>
      <CestaPage />
    </ProtectedGate>
  ),
});

function CestaPage() {
  const fetchCart = useServerFn(getCart);
  const removeFn = useServerFn(removeFromCart);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: () => fetchCart(),
    staleTime: 30_000,
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => removeFn({ data: { itemId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Produto removido da cesta");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Falha ao remover";
      toast.error(msg);
    },
  });

  const items = data?.items ?? [];
  const totalItems = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="min-h-[100dvh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-md px-3 py-4 sm:px-4">
        <header className="mb-4 flex items-center gap-3">
          <Link
            to="/"
            aria-label="Voltar"
            className="rounded-full border border-primary/20 p-1.5 text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Sua seleção
            </p>
            <h1 className="font-display text-2xl leading-tight tracking-tight text-foreground">
              Minha cesta
            </h1>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
            <ShoppingBag className="h-3 w-3" strokeWidth={2.4} />
            {totalItems}
          </span>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">Carregando cesta…</span>
          </div>
        ) : items.length === 0 ? (
          <EmptyCart />
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm"
              >
                <ProductImage
                  src={it.imageUrl}
                  alt={it.displayName}
                  width={64}
                  height={64}
                  fallbackIcon={Package}
                  fallbackLabel={it.displayName}
                  className="h-16 w-16 shrink-0 rounded-xl bg-gradient-to-br from-muted to-background"
                  imageClassName="object-contain p-1"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/produto-publico/$slug"
                    params={{ slug: it.catalogId }}
                    className="line-clamp-2 text-sm font-semibold leading-tight text-foreground hover:underline"
                  >
                    {it.displayName}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {it.brand && <span className="truncate">{it.brand}</span>}
                    <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[9px] text-foreground">
                      x{it.quantity}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(it.id)}
                  disabled={removeMutation.isPending}
                  aria-label={`Remover ${it.displayName} da cesta`}
                  className="shrink-0 rounded-full border border-destructive/30 p-2 text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {items.length > 0 && (
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">
              Compare preços em cada mercado a partir da sua cesta.
            </p>
            <Link
              to="/lista"
              className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
            >
              Ver melhores preços
            </Link>
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
      <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      <p className="mt-3 text-sm font-semibold text-foreground">Cesta vazia</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Adicione produtos da home para comparar preços entre mercados.
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-primary-foreground hover:bg-primary/90"
      >
        Explorar produtos
      </Link>
    </div>
  );
}
