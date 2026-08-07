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
    <div className="min-h-[100svh] bg-[var(--bg-base)] pb-[calc(var(--mobile-nav-height)+1.5rem)] text-foreground">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <PageHeader
          breadcrumbs={[{ label: "Painel", to: "/app" }, { label: "Minha cesta" }]}
          title="Minha cesta"
          description="Acompanhe o valor total e veja onde sua compra sai mais barata."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPrices}
                disabled={isFetching || items.length === 0}
                className="rounded-xl border-[var(--border-subtle)] bg-[var(--bg-surface)]"
              >
                <RefreshCw
                  className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                  strokeWidth={2.2}
                />
                Atualizar
              </Button>
              {items.length > 0 && (
                <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--brand-primary)]/10 px-4 text-[13px] font-black uppercase tracking-wider text-[var(--brand-primary)]">
                  {totalItems} {totalItems === 1 ? "item" : "itens"}
                </span>
              )}
            </div>
          }
        />

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-border bg-[var(--bg-surface)] p-12 text-center">
            <ShoppingBag
              className="mx-auto h-12 w-12 text-muted-foreground opacity-20"
              aria-hidden
            />
            <h3 className="mt-4 font-display text-lg font-bold text-foreground">Sua cesta está vazia</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              Adicione produtos para comparar o valor total entre os mercados de Feijó.
            </p>
            <Button asChild className="mt-6 rounded-xl px-8" size="lg">
              <Link to="/app/produtos">Buscar produtos</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
               <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Itens Selecionados</h2>
               <div className="space-y-3">
                 {items.map((it) => (
                   <div key={it.id} className="pc-card flex items-center gap-4 p-4 md:p-5">
                      <ProductImage
                        src={it.imageUrl}
                        alt={it.displayName}
                        width={64}
                        height={64}
                        fallbackIcon={Package}
                        fallbackLabel={it.displayName}
                        className="h-16 w-16 shrink-0 rounded-2xl bg-white p-1 shadow-sm"
                        imageClassName="object-contain"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/produto-publico/$slug"
                          params={{ slug: it.catalogId || "" }}
                          className="line-clamp-2 font-display text-base font-bold text-foreground hover:text-[var(--brand-primary)] transition-colors"
                        >
                          {it.displayName}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                          {it.brand && <span>{it.brand}</span>}
                          {it.brand && <span aria-hidden>·</span>}
                          <span className="text-[var(--brand-primary)]">Qtd: {it.quantity}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => requestRemove(it.id, it.displayName)}
                        disabled={removeMutation.isPending}
                        className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                   </div>
                 ))}
               </div>
            </div>

            <div className="space-y-6">
               <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Resumo</h2>
               <div className="pc-card sticky top-24 space-y-4 p-6">
                 <div className="space-y-2">
                   <p className="text-[13px] text-muted-foreground">Compare os preços da sua cesta em cada mercado cadastrado para economizar.</p>
                 </div>
                 <Button asChild className="w-full rounded-xl" size="lg">
                    <Link to="/lista">
                      Ver Melhores Preços
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                 </Button>
               </div>
            </div>
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
