import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { MobileNav } from "@/components/nav/MobileNav";
import { ProductImage } from "@/components/product/ProductImage";
import { ShoppingBag, Trash2, Package, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getCart, removeFromCart, type Cart } from "@/lib/cart.functions";
import { PageHeader, SectionCard, EmptyState, LoadingSkeleton } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

type PendingRemoval = { id: string; name: string } | null;

function CestaPage() {
  const fetchCart = useServerFn(getCart);
  const removeFn = useServerFn(removeFromCart);
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [pending, setPending] = useState<PendingRemoval>(null);

  const { data, isLoading, isFetching } = useQuery<Cart>({
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

  const requestRemove = (id: string, name: string) => {
    if (isMobile) {
      setPending({ id, name });
      return;
    }
    removeMutation.mutate(id);
  };

  const confirmRemove = () => {
    if (!pending) return;
    removeMutation.mutate(pending.id);
    setPending(null);
  };

  const handleRefreshPrices = async () => {
    const toastId = toast.loading("Atualizando preços da cesta...");
    try {
      await qc.invalidateQueries({ queryKey: ["cart"] });
      await qc.refetchQueries({ queryKey: ["cart"] });
      toast.success("Preços atualizados", { id: toastId });
    } catch {
      toast.error("Não foi possível atualizar agora", { id: toastId });
    }
  };

  const items = data?.items ?? [];
  const totalItems = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <div className="min-h-[100svh] bg-background pb-[calc(var(--mobile-nav-height)+1rem)] text-foreground">
      <div className="mx-auto max-w-2xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Início", to: "/" }, { label: "Minha cesta" }]}
          title="Minha cesta"
          description="Produtos selecionados para comparar entre mercados."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPrices}
                disabled={isFetching || items.length === 0}
                aria-label="Atualizar preços da cesta"
              >
                <RefreshCw
                  className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                  strokeWidth={2.2}
                />
                Atualizar preços
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary">
                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.2} />
                {totalItems} {totalItems === 1 ? "item" : "itens"}
              </span>
            </div>
          }
        />

        <SectionCard
          title="Itens na cesta"
          description="Toque em um produto para ver detalhes; use a lixeira para remover."
          bodyClassName="p-0"
        >
          {isLoading ? (
            <div className="p-4">
              <LoadingSkeleton rows={4} />
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={ShoppingBag}
                title="Cesta vazia"
                description="Adicione produtos a partir da home para comparar preços entre mercados."
                action={
                  <Button asChild variant="default" size="sm">
                    <Link to="/">Explorar produtos</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-4 py-3">
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
                      params={{ slug: it.catalogId || "" }}
                      className="line-clamp-2 text-[14px] font-semibold leading-tight text-foreground hover:underline"
                    >
                      {it.displayName}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                      {it.brand && <span className="truncate">{it.brand}</span>}
                      <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[12px] text-foreground">
                        x{it.quantity}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestRemove(it.id, it.displayName)}
                    disabled={removeMutation.isPending}
                    aria-label={`Remover ${it.displayName} da cesta`}
                    className="shrink-0 rounded-full border border-destructive/30 p-2 text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {items.length > 0 && (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-[13.5px] text-muted-foreground">
              Compare os preços da sua cesta em cada mercado cadastrado.
            </p>
            <Button asChild variant="default" size="sm">
              <Link to="/lista">
                Ver melhores preços
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
      <MobileNav />

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da cesta?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.name
                ? `“${pending.name}” será retirado da sua cesta.`
                : "O item será retirado da sua cesta."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
