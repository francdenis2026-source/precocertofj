import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { ProductImage } from "@/components/ds/ProductImage";
import { ShoppingBag, Trash2, Package, ArrowRight, RefreshCw, ChevronLeft, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { getCart, removeFromCart, type Cart } from "@/lib/cart.functions";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/brand/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ds/Price";
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
      { title: "Minha Cesta — PreçoCerto" },
      {
        name: "description",
        content: "Produtos adicionados à sua cesta para comparação de preços.",
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
  const [pending, setPending] = useState<PendingRemoval>(null);

  const { data, isLoading, isFetching } = useQuery<Cart>({
    queryKey: ["cart"],
    queryFn: () => fetchCart(),
    staleTime: 1000 * 60 * 60, // 60 minutos de cache persistente no cliente
    gcTime: 1000 * 60 * 60 * 24, // 24 horas no garbage collector
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

  const confirmRemove = () => {
    if (!pending) return;
    removeMutation.mutate(pending.id);
    setPending(null);
  };

  const handleRefreshPrices = async () => {
    const toastId = toast.loading("Atualizando preços...");
    try {
      await qc.invalidateQueries({ queryKey: ["cart"] });
      await qc.refetchQueries({ queryKey: ["cart"] });
      toast.success("Preços atualizados", { id: toastId });
    } catch {
      toast.error("Erro ao atualizar", { id: toastId });
    }
  };

  const items = data?.items ?? [];
  const totalItems = items.reduce((s, it) => s + it.quantity, 0);

  // Cálculo de economia total estimada
  const totalSavings = items.reduce((acc, it) => {
    if (it.minPrice && it.avgPrice && it.avgPrice > it.minPrice) {
      return acc + (it.avgPrice - it.minPrice) * it.quantity;
    }
    return acc;
  }, 0);

  const totalMinPrice = items.reduce((acc, it) => {
    if (it.minPrice) return acc + it.minPrice * it.quantity;
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <SiteHeader variant="solid" />
      
      <main className="mx-auto max-w-[1440px] px-4 md:px-8 py-12">
        <header className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8">
            <ChevronLeft size={18} />
            Início
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--border-subtle)] pb-8">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter uppercase leading-[0.9] text-[var(--text-primary)]">Minha Cesta</h1>
              <p className="text-[var(--text-secondary)] text-[16px] font-bold">Gerencie os itens da sua lista de compras.</p>
            </div>
            <div className="flex items-center gap-3">
               <Button
                variant="outline"
                onClick={handleRefreshPrices}
                disabled={isFetching || items.length === 0}
                className="h-12 rounded-[var(--radius-2xl)] bg-[var(--bg-surface)] border-[var(--border-subtle)] px-6 font-black uppercase tracking-widest text-[12px]"
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
                />
                Sincronizar
              </Button>
              {items.length > 0 && (
                <div className="h-12 flex items-center px-6 rounded-[var(--radius-2xl)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 font-black uppercase tracking-widest text-[12px]">
                  {totalItems} {totalItems === 1 ? "Item" : "Itens"}
                </div>
              )}
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="grid gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-32 flex flex-col items-center text-center rounded-[var(--radius-2xl)] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/30">
            <div className="h-24 w-24 bg-[var(--bg-surface-elevated)] rounded-full flex items-center justify-center mb-8 border border-[var(--border-subtle)]">
              <ShoppingBag size={48} className="text-[var(--text-tertiary)]" />
            </div>
            <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Cesta vazia</h3>
            <p className="text-[var(--text-secondary)] font-bold text-lg max-w-sm mb-10">Adicione produtos do catálogo para comparar os preços entre os mercados.</p>
            <Button asChild className="pc-button-primary h-14 px-10">
              <Link to="/precos">Buscar Produtos</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Resumo de Economia no Topo (Mobile/Desktop) */}
            {totalSavings > 0 && (
              <div className="lg:col-span-12 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-[var(--radius-2xl)] bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-soft)] text-[var(--text-on-brand)] shadow-[var(--shadow-lg)] shadow-[var(--brand-primary)]/20 border border-white/10">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[var(--radius-2xl)] bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <TrendingDown size={32} className="text-white" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80">Economia Estimada</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black tracking-tighter">
                          <Price value={totalSavings} className="text-white" />
                        </span>
                        <span className="text-[12px] font-bold uppercase tracking-widest opacity-70">nesta compra</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden md:block h-12 w-px bg-white/20" />

                  <div className="flex flex-col items-center md:items-start gap-1">
                    <p className="text-[13px] font-bold text-white/90">Sua lista está otimizada com os melhores preços de Feijó.</p>
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/60">Baseado no menor valor verificado hoje</p>
                  </div>

                  <Button asChild className="bg-white text-[var(--brand-primary)] hover:bg-white/90 h-14 px-8 rounded-[var(--radius-xl)] font-black uppercase tracking-widest text-[12px] shadow-[var(--shadow-md)] shadow-black/10 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    <Link to="/lista">
                      Ver Ofertas
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            <div className="lg:col-span-8 space-y-6">
               <h2 className="text-[12px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">Itens Selecionados</h2>
               <div className="grid gap-4">
                 {items.map((it) => (
                   <div key={it.id} className="group relative flex items-center gap-6 p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 transition-all duration-300">
                      <div className="h-24 w-24 shrink-0 rounded-[var(--radius-2xl)] bg-[var(--bg-surface-elevated)]/50 p-2 border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                        <ProductImage
                          name={it.displayName}
                          alt={it.displayName}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/produto-publico/$slug"
                          params={{ slug: it.catalogId || "" }}
                          className="line-clamp-2 text-lg font-black uppercase tracking-tight text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors"
                        >
                          {it.displayName}
                        </Link>
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                          {it.brand && <span className="text-[var(--text-secondary)]">{it.brand}</span>}
                          
                          {it.minPrice && (
                            <div className="flex items-center gap-1.5 text-[var(--success)] bg-[var(--success)]/5 px-2 py-1 rounded-lg border border-[var(--success)]/10">
                              <TrendingDown size={14} />
                              <span>A partir de <Price value={it.minPrice} size="sm" className="inline-block ml-0.5" /></span>
                            </div>
                          )}

                          {it.minPrice && it.avgPrice && it.avgPrice > it.minPrice && (
                            <div className="flex items-center gap-1.5 text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 px-2 py-1 rounded-lg border border-[var(--brand-primary)]/10">
                              <span>-{Math.round(((it.avgPrice - it.minPrice) / it.avgPrice) * 100)}% de economia</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                            <Package size={14} />
                            <span>Qtd: {it.quantity}</span>
                          </div>
                        </div>

                      </div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setPending({ id: it.id, name: it.displayName })}
                          className="h-11 w-11 rounded-[var(--radius-xl)] bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--danger)] hover:text-[var(--text-on-brand)] transition-all border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
            </div>

            <div className="lg:col-span-4">
               <div className="sticky top-32 space-y-8">
                  <div className="rounded-[var(--radius-2xl)] bg-[var(--bg-surface-elevated)]/40 p-8 border border-[var(--border-subtle)] shadow-sm">
                    <h2 className="text-[14px] font-black uppercase tracking-widest mb-6 border-b border-[var(--border-subtle)] pb-4">Resumo da Cesta</h2>
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center text-[13px] font-bold text-[var(--text-secondary)]">
                        <span>Subtotal Estimado</span>
                        <Price value={totalMinPrice + totalSavings} size="sm" />
                      </div>
                      {totalSavings > 0 && (
                        <div className="flex justify-between items-center text-[13px] font-black text-[var(--success)] bg-[var(--success)]/5 p-3 rounded-[var(--radius-xl)] border border-[var(--success)]/10">
                          <span>Economia Aplicada</span>
                          <span className="flex items-center gap-1">
                            -<Price value={totalSavings} size="sm" />
                          </span>
                        </div>
                      )}
                      <div className="pt-4 border-t border-[var(--border-subtle)] flex justify-between items-end">
                        <div className="space-y-1">
                          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--text-tertiary)]">Total Estimado</span>
                          <div className="text-2xl font-black tracking-tighter">
                            <Price value={totalMinPrice} />
                          </div>
                        </div>
                        <div className="text-right">
                           <span className="text-[10px] font-black uppercase tracking-widest text-[var(--success)] px-2 py-1 bg-[var(--success)]/10 rounded-lg">Melhor Valor</span>
                        </div>
                      </div>
                    </div>
                    <Button asChild className="pc-button-primary w-full h-14 text-[13px] shadow-xl shadow-[var(--brand-primary)]/20">
                        <Link to="/lista">
                          Gerar Lista de Compras
                          <ArrowRight className="ml-3 h-5 w-5" />
                        </Link>
                    </Button>
                  </div>
                  
                  <div className="rounded-[var(--radius-xl)] bg-[var(--brand-primary)]/5 p-6 border border-[var(--brand-primary)]/10">
                     <div className="flex items-start gap-4">
                        <RefreshCw className="h-5 w-5 text-[var(--brand-primary)] shrink-0 mt-1" />
                        <p className="text-[12px] font-bold text-[var(--text-secondary)]">Os preços são atualizados conforme os mercados enviam novos dados para a plataforma.</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="rounded-[var(--radius-2xl)] border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Remover da Cesta?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-[var(--text-secondary)]">
              {pending?.name
                ? `O produto “${pending.name}” será retirado da sua lista de monitoramento.`
                : "Este item será retirado da sua cesta."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3">
            <AlertDialogCancel className="h-12 rounded-[var(--radius-xl)] border-[var(--border-subtle)] font-bold uppercase tracking-widest text-[11px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="h-12 rounded-[var(--radius-xl)] bg-[var(--danger)] text-[var(--text-on-brand)] hover:bg-[var(--danger)]/90 font-bold uppercase tracking-widest text-[11px] px-8"
            >
              Remover Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}