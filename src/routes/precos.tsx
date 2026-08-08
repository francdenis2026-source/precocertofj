import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { 
  Store, 
  MapPin, 
  Clock, 
  TrendingDown, 
  ChevronRight, 
  Star, 
  ArrowRight, 
  Filter,
  Package,
  TrendingUp,
  Search,
  LayoutGrid,
  Info,
  Scale
} from "lucide-react";

import { searchProductPrice, type ProductGroup } from "@/lib/price-search.functions";
import { listPublicEstablishments } from "@/lib/establishments-public.functions";
import { Price } from "@/components/ds/Price";
import { ProductImage } from "@/components/ds/ProductImage";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/brand/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  sel: fallback(z.string(), "").default(""), // establishmentId
});

export const Route = createFileRoute("/precos")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Comparador de Preços — PreçoCerto" },
      { name: "description", content: "Compare preços reais de produtos nos mercados de Feijó." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, sel } = Route.useSearch() as any;
  const [activeMarketId, setActiveMarketId] = useState<string | null>(sel || null);
  
  const runSearch = useServerFn(searchProductPrice);
  const { data: searchResult, isLoading: isSearchLoading } = useQuery({
    queryKey: ["price-search", q],
    queryFn: () => runSearch({ data: { query: q } }),
    enabled: !!q && q.length >= 2,
    staleTime: 60_000,
  });

  const fetchMarkets = useServerFn(listPublicEstablishments);
  const { data: marketsData, isLoading: isMarketsLoading } = useQuery({
    queryKey: ["public-establishments-list"],
    queryFn: () => fetchMarkets({}),
    staleTime: 5 * 60_000,
  });

  const markets = marketsData?.items ?? [];
  const activeMarket = useMemo(() => 
    markets.find(m => m.id === (activeMarketId || sel)) || markets[0],
  [markets, activeMarketId, sel]);

  const filteredGroups = useMemo(() => {
    if (!searchResult) return [];
    if (!activeMarketId) return searchResult.groups;
    return searchResult.groups.filter(g => 
      g.prices.some(p => p.establishmentId === activeMarketId)
    );
  }, [searchResult, activeMarketId]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand-primary)]/30">
      <SiteHeader variant="solid" />
      
      <div className="mx-auto w-full max-w-[1600px] flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
        
        {/* Left Sidebar: Markets List */}
        <aside className="w-full md:w-[420px] bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col shrink-0">
          <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-0 z-20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex flex-col">
                <h2 className="text-[12px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">Plataforma Ativa</h2>
                <p className="text-[18px] font-black tracking-tight mt-1">Mercados em Feijó</p>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full text-[var(--text-tertiary)] hover:text-[var(--brand-primary)]">
                  <Link to="/app/comparacoes">
                    <Scale className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="flex items-center gap-1.5 bg-[var(--bg-surface-elevated)] px-3 py-1.5 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary)]">{markets.length}</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-tertiary)]" />
              <input 
                type="text" 
                placeholder="Localizar estabelecimento..." 
                className="w-full pl-12 pr-4 py-4 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-[var(--radius-xl)] text-[15px] font-bold outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/5 focus:border-[var(--brand-primary)] transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {isMarketsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-[var(--bg-surface-elevated)] animate-pulse rounded-[var(--radius-2xl)] border border-[var(--border-subtle)]" />
              ))
            ) : (
              markets.map(m => (
                <button
                  key={m.id}
                  onClick={() => setActiveMarketId(m.id)}
                  className={cn(
                    "w-full text-left p-5 rounded-[var(--radius-2xl)] border transition-all duration-300 relative group",
                    activeMarketId === m.id 
                      ? "bg-[var(--bg-surface-elevated)] border-[var(--brand-primary)] shadow-xl translate-x-1" 
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--bg-surface-elevated)]"
                  )}
                >
                  <div className="flex gap-5">
                    <div className={cn(
                      "h-16 w-16 shrink-0 rounded-[var(--radius-xl)] bg-white p-2 border flex items-center justify-center overflow-hidden transition-all duration-300",
                      activeMarketId === m.id ? "border-[var(--brand-primary)] shadow-[var(--shadow-sm)]" : "border-[var(--border-subtle)]"
                    )}>
                      {m.logoUrl ? (
                         <img src={m.logoUrl} alt={m.name} className="h-full w-full object-contain" />
                      ) : (
                         <Store className="h-8 w-8 text-[var(--text-tertiary)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-[16px] tracking-tight truncate leading-none uppercase">{m.name}</h3>
                        {m.maxSavings > 0 && (
                          <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-[var(--radius-lg)] border border-emerald-500/20">
                            -{m.maxSavings}%
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mt-2">{m.neighborhood || "Centro"}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)]">
                          <Package className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
                          <span>{m.productsCount || 0} Itens</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Online</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {activeMarketId === m.id && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <ChevronRight size={20} className="text-[var(--brand-primary)]" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 bg-[var(--bg-base)] overflow-y-auto p-8 md:p-12 space-y-12 no-scrollbar">
          
          {/* Market Hero Card */}
          {activeMarket && (
            <section className="bg-[var(--bg-surface)] rounded-[var(--radius-3xl)] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--shadow-2xl)] relative">
              <div className="h-48 bg-[var(--bg-surface-elevated)] relative overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1400" 
                  alt="" 
                  className="w-full h-full object-cover opacity-30 mix-blend-overlay grayscale" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
              </div>
              <div className="px-10 pb-12 -mt-16 relative z-10">
                <div className="flex flex-col md:flex-row items-end gap-8 mb-10">
                  <div className="h-36 w-36 rounded-[32px] bg-white p-3 border-4 border-[var(--bg-base)] shadow-[var(--shadow-lg)] flex items-center justify-center overflow-hidden shrink-0">
                    {activeMarket.logoUrl ? (
                      <img src={activeMarket.logoUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <Store className="h-16 w-16 text-[var(--brand-primary)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-[var(--radius-xl)] border border-[var(--brand-primary)]/20">Mercado Verificado</span>
                    </div>
                    <h1 className="text-[clamp(1.5rem,4vw,3.5rem)] font-black tracking-tighter mb-4 leading-none uppercase">{activeMarket.name}</h1>
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2 text-[15px] font-bold text-[var(--text-secondary)]">
                        <MapPin className="h-5 w-5 text-[var(--brand-primary)]" />
                        <span>{activeMarket.neighborhood}, {activeMarket.city || "Feijó, AC"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[15px] font-bold text-emerald-600">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Operação Normal</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pb-2">
                    <Link 
                      to="/loja/$id" 
                      params={{ id: activeMarket.id }}
                      search={{ q: "", from: "" }}
                      className="pc-button-primary h-14 px-10 shadow-[var(--shadow-lg)] shadow-[var(--brand-primary)]/20 text-[14px] uppercase tracking-widest"
                    >
                      Entrar na Loja <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t border-[var(--border-subtle)]">
                  <StatCard label="Mix de Itens" value={String(activeMarket?.productsCount || 0)} icon={<Package className="h-5 w-5" />} />
                  <StatCard label="Departamentos" value={String(activeMarket?.topCategories?.length || 0)} icon={<Filter className="h-5 w-5" />} />
                  <StatCard label="Taxa de Economia" value={`${activeMarket?.maxSavings || 0}%`} icon={<TrendingDown className="h-5 w-5" />} tone="savings" />
                  <StatCard label="Preço Mínimo" value={activeMarket?.minPrice ? `R$ ${activeMarket.minPrice.toFixed(2)}` : "—"} icon={<TrendingUp className="h-5 w-5" />} tone="offers" />
                </div>
              </div>
            </section>
          )}

          {/* Search Results Area */}
          <div className="space-y-10">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                  <h2 className="text-[12px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">Inteligência de Mercado</h2>
                </div>
                <h3 className="text-3xl font-black tracking-tight uppercase">
                  {q ? `Resultados para "${q}"` : "Destaques em Destaque"}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <button className="h-12 px-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[13px] font-black uppercase tracking-wider flex items-center gap-2 hover:bg-[var(--bg-surface-elevated)] transition-all">
                  <LayoutGrid size={18} /> Galeria
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
              {isSearchLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4.5] bg-[var(--bg-surface)] rounded-[var(--radius-2xl)] animate-pulse border border-[var(--border-subtle)]" />
                ))
              ) : filteredGroups.length === 0 ? (
                <div className="col-span-full py-32 flex flex-col items-center text-center px-6">
                  <div className="h-24 w-24 bg-[var(--bg-surface-elevated)] rounded-full flex items-center justify-center mb-8 border border-[var(--border-subtle)]">
                    <Info size={40} className="text-[var(--text-tertiary)]" />
                  </div>
                  <h4 className="text-2xl font-black mb-4 uppercase tracking-tight">Nenhum item localizado</h4>
                  <p className="text-[var(--text-secondary)] font-bold text-lg max-w-lg">Não encontramos produtos com este termo no estoque de <span className="text-[var(--text-primary)]">{activeMarket?.name}</span>.</p>
                </div>
              ) : (
                filteredGroups.map((g) => (
                  <MarketProductCard key={g.productName} group={g} marketId={activeMarketId} />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function StatCard({ label, value, icon, tone = "default" }: { label: string; value: string; icon: React.ReactNode; tone?: "default" | "savings" | "offers" }) {
  return (
    <div className="flex flex-col justify-between h-full bg-[var(--bg-surface-elevated)]/30 rounded-[var(--radius-2xl)] p-6 border border-[var(--border-subtle)] shadow-sm hover:border-[var(--brand-primary)]/20 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-black uppercase tracking-widest text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors">{label}</span>
        <div className={cn(
          "h-10 w-10 rounded-[var(--radius-xl)] flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-[var(--shadow-sm)]",
          tone === "savings" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : 
          tone === "offers" ? "bg-red-500/10 text-red-600 border border-red-500/20" : 
          "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20"
        )}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black text-[var(--text-primary)] tracking-tight leading-none">{value}</div>
    </div>
  );
}

function MarketProductCard({ group, marketId }: { group: ProductGroup; marketId: string | null }) {
  const priceObj = marketId ? group.prices.find(p => p.establishmentId === marketId) : group.prices[0];
  if (!priceObj) return null;
  const savings = Math.round(((group.max - priceObj.price) / group.max) * 100);
  
  return (
    <article className="group relative flex flex-col bg-[var(--bg-surface)] rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] overflow-hidden transition-all duration-500 hover:shadow-[var(--shadow-lg)] hover:border-[var(--brand-primary)]/30 hover:-translate-y-2">
      <div className="aspect-square bg-white p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface-elevated)]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <ProductImage 
          name={group.productName} 
          alt={group.productName} 
          className="w-full h-full object-contain transition-transform duration-700 ease-out group-hover:scale-110 relative z-10" 
        />
        {savings > 5 && (
          <div className="absolute top-4 right-4 z-20">
             <span className="bg-[var(--success)] text-[var(--text-on-brand)] text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] shadow-[var(--success)]/30">
               -{savings}% OFF
             </span>
          </div>
        )}
      </div>
      
      <div className="p-6 flex flex-col flex-1 relative bg-[var(--bg-surface)]">
        <div className="flex-1 mb-6">
          <h4 className="font-black text-[16px] leading-tight line-clamp-2 uppercase tracking-tight group-hover:text-[var(--brand-primary)] transition-colors min-h-[2.5rem]">
            {group.productName}
          </h4>
          <div className="flex items-center gap-2 mt-4">
             <div className="h-1 w-1 rounded-full bg-emerald-500" />
             <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.15em]">Preço Verificado</span>
          </div>
        </div>
        
        <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between">
           <div className="flex flex-col">
             {savings > 5 && (
               <span className="text-[11px] font-bold text-[var(--text-tertiary)] line-through mb-1 opacity-60">
                 R$ {group.max.toFixed(2)}
               </span>
             )}
             <Price value={priceObj.price} size="lg" className="text-2xl font-black tracking-tighter" />
           </div>
           <button className="h-12 w-12 rounded-[var(--radius-xl)] bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--brand-primary)] hover:text-[var(--text-on-brand)] hover:rotate-45 transition-all duration-[var(--dur-base)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]">
             <ArrowRight className="h-5 w-5" />
           </button>
        </div>
      </div>
    </article>
  );
}
