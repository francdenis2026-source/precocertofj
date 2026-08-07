import { createFileRoute, Link, useNavigate, retainSearchParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { 
  Search, 
  Store, 
  MapPin, 
  Clock, 
  TrendingDown, 
  ChevronRight, 
  Star, 
  ArrowRight, 
  Filter,
  LayoutGrid,
  Rows3,
  Package,
  TrendingUp,
  X
} from "lucide-react";

import { searchProductPrice, type PriceSearchResult, type ProductGroup } from "@/lib/price-search.functions";
import { listPublicEstablishments } from "@/lib/establishments-public.functions";
import { Price } from "@/components/ds/Price";
import { Badge } from "@/components/ds/Badge";
import { ProductImage } from "@/components/ds/ProductImage";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/SiteHeader";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  sel: fallback(z.string(), "").default(""), // establishmentId
});

export const Route = createFileRoute("/precos")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["q", "sel"])],
  },
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
  const navigate = useNavigate({ from: "/precos" });
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

  const selectMarket = (id: string) => {
    setActiveMarketId(id);
    navigate({ search: (prev: any) => ({ ...prev, sel: id }) });
  };

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
        <aside className="w-full md:w-[380px] bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col shrink-0">
          <div className="p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-0 z-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Mercados em Feijó</h2>
              <span className="pc-badge bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]">{markets.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <input 
                type="text" 
                placeholder="Filtrar por nome..." 
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {isMarketsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 bg-[var(--bg-surface-elevated)] animate-pulse rounded-2xl" />
              ))
            ) : (
              markets.map(m => (
                <button
                  key={m.id}
                  onClick={() => selectMarket(m.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all duration-200",
                    activeMarketId === m.id 
                      ? "bg-[var(--bg-surface)] border-[var(--brand-primary)] shadow-[var(--pc-shadow-md)]" 
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 hover:bg-[var(--bg-surface-elevated)]"
                  )}
                >
                  <div className="flex gap-4">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                      {m.logoUrl ? (
                         <img src={m.logoUrl} alt={m.name} className="h-full w-full object-contain p-1" />
                      ) : (
                         <Store className="h-6 w-6 text-[var(--text-tertiary)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-[15px] truncate">{m.name}</h3>
                        {m.maxSavings > 0 && <span className="pc-badge bg-emerald-500/10 text-emerald-600">-{m.maxSavings}%</span>}
                      </div>
                      <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mt-1">{m.neighborhood || "Centro"}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] flex items-center gap-1">
                          <Package className="h-3 w-3" /> {m.productsCount || 0} itens
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Online
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 bg-[var(--bg-base)] overflow-y-auto p-6 md:p-10 space-y-8 no-scrollbar">
          
          {/* Market Hero Card */}
          {activeMarket && (
            <section className="bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-subtle)] overflow-hidden shadow-[var(--pc-shadow-lg)]">
              <div className="h-40 bg-[var(--bg-surface-elevated)] relative">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200" 
                  alt="" 
                  className="w-full h-full object-cover opacity-40 mix-blend-overlay" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-transparent to-transparent" />
              </div>
              <div className="px-10 pb-10 -mt-12 relative z-10">
                <div className="flex flex-col md:flex-row items-end gap-6 mb-8">
                  <div className="h-32 w-32 rounded-[24px] bg-white p-2 border border-[var(--border-subtle)] shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
                    {activeMarket.logoUrl ? <img src={activeMarket.logoUrl} alt="" className="h-full w-full object-contain" /> : <Store className="h-12 w-12 text-[var(--brand-primary)]" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <h1 className="text-4xl font-black tracking-tight mb-2 truncate">{activeMarket.name}</h1>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[13px] font-bold text-[var(--text-secondary)]">
                        <MapPin className="h-4 w-4 text-[var(--brand-primary)]" />
                        <span>{activeMarket.city || "Feijó, AC"}</span>
                      </div>
                      <div className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                      <div className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-600">
                        <Clock className="h-4 w-4" />
                        <span>Aberto agora</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pb-2">
                    <button className="pc-button-secondary h-11 px-6">
                      <Star className="h-4 w-4" /> Favoritar
                    </button>
                    <Link 
                      to="/loja/$id" 
                      params={{ id: activeMarket.id }}
                      search={{ q: "", from: "" }}
                      className="pc-button-primary h-11 px-8"
                    >
                      Ver Loja <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8 border-t border-[var(--border-subtle)]">
                  <StatCard label="Mix de Produtos" value={String(activeMarket?.productsCount || 0)} icon={<Package className="h-4 w-4" />} />
                  <StatCard label="Categorias" value={String(activeMarket?.topCategories?.length || 0)} icon={<Filter className="h-4 w-4" />} />
                  <StatCard label="Economia Média" value={`${activeMarket?.maxSavings || 0}%`} icon={<TrendingDown className="h-4 w-4" />} tone="savings" />
                  <StatCard label="Preço Mínimo" value={activeMarket?.minPrice ? `R$ ${activeMarket.minPrice.toFixed(2)}` : "—"} icon={<TrendingUp className="h-4 w-4" />} tone="offers" />
                </div>
              </div>
            </section>
          )}

          {/* Featured Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] mb-1">Destaques da Loja</h2>
                <h3 className="text-2xl font-black tracking-tight">Melhores Ofertas</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isSearchLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-[var(--bg-surface)] rounded-3xl animate-pulse border border-[var(--border-subtle)]" />
                ))
              ) : filteredGroups.length === 0 ? (
                <div className="col-span-full py-20 text-center pc-card border-dashed">
                  <p className="font-bold text-lg mb-2">Sem produtos nesta loja</p>
                  <p className="text-[var(--text-secondary)]">Tente buscar por outro termo ou selecione outro mercado.</p>
                </div>
              ) : (
                filteredGroups.slice(0, 8).map((g) => (
                  <MarketProductCard key={g.productName} group={g} marketId={activeMarketId} />
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, tone = "default" }: { label: string; value: string; icon: React.ReactNode; tone?: "default" | "savings" | "offers" }) {
  return (
    <div className="pc-stat-card flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">{label}</span>
        <div className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center",
          tone === "savings" ? "bg-emerald-500/10 text-emerald-600" : 
          tone === "offers" ? "bg-red-500/10 text-red-600" : 
          "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
        )}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function MarketProductCard({ group, marketId }: { group: ProductGroup; marketId: string | null }) {
  const priceObj = marketId ? group.prices.find(p => p.establishmentId === marketId) : group.prices[0];
  if (!priceObj) return null;
  const savings = Math.round(((group.max - priceObj.price) / group.max) * 100);
  
  return (
    <article className="pc-card p-0 group overflow-hidden flex flex-col">
      <div className="aspect-square bg-[var(--bg-surface-elevated)]/50 p-6 flex items-center justify-center relative">
        <ProductImage name={group.productName} alt={group.productName} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" />
        {savings > 5 && (
          <div className="absolute top-4 right-4">
             <span className="pc-badge bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">-{savings}%</span>
          </div>
        )}
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1 mb-4">
          <h4 className="font-bold text-[15px] leading-snug line-clamp-2 group-hover:text-[var(--brand-primary)] transition-colors mb-2">{group.productName}</h4>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
            <Clock className="h-3 w-3" /> Hoje
          </div>
        </div>
        
        <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
           <div className="flex flex-col">
             {savings > 5 && <span className="text-[10px] text-[var(--text-tertiary)] line-through mb-0.5">R$ {group.max.toFixed(2)}</span>}
             <Price value={priceObj.price} size="lg" className="text-xl font-black" />
           </div>
           <button className="h-10 w-10 rounded-xl bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--brand-primary)] hover:text-black transition-all">
             <ArrowRight className="h-4 w-4" />
           </button>
        </div>
      </div>
    </article>
  );
}

function StatCard({ label, value, icon, tone = "default" }: { label: string; value: string; icon: React.ReactNode; tone?: "default" | "savings" | "offers" }) {
  const colors = {
    default: "text-[#2563EB] bg-[#2563EB]/10",
    savings: "text-[#16A34A] bg-[#16A34A]/10",
    offers: "text-[#DC2626] bg-[#DC2626]/10",
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded-lg", colors[tone])}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[#111827]">{value}</div>
    </div>
  );
}

function ProductCard({ group, marketId }: { group: ProductGroup; marketId: string | null }) {
  const priceObj = marketId ? group.prices.find(p => p.establishmentId === marketId) : group.prices[0];
  if (!priceObj) return null;
  
  return (
    <article className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden hover:border-[#2563EB]/50 hover:shadow-xl transition-all group">
      <div className="aspect-square bg-[#F9FAFB] p-6 flex items-center justify-center relative">
        <ProductImage name={group.productName} alt={group.productName} size="lg" className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
        <div className="absolute top-3 right-3">
           <Badge variant="savings" size="sm" className="bg-[#16A34A] text-white border-none shadow-md shadow-[#16A34A]/20">-{Math.round(((group.max - group.min)/group.max)*100)}%</Badge>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">Marca</span>
          <h3 className="font-bold text-sm text-[#111827] line-clamp-2 leading-tight">{group.productName}</h3>
        </div>
        
        <div className="flex items-end justify-between">
           <div className="space-y-0.5">
             <div className="flex items-center gap-2">
               <span className="text-[10px] text-[#6B7280] line-through">R$ {group.max.toFixed(2)}</span>
               <Badge variant="savingsSoft" size="sm" className="bg-[#16A34A]/10 text-[#16A34A] font-bold py-0 h-4">Economize</Badge>
             </div>
             <Price value={priceObj.price} size="lg" className="text-[#111827] font-bold" />
           </div>
           <div className="text-right">
             <div className="flex items-center justify-end gap-1 text-[9px] font-bold text-[#6B7280] uppercase">
                <Clock className="h-2.5 w-2.5" /> hoje
             </div>
           </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-[#F3F4F6]">
           <button className="flex-1 h-9 rounded-lg border border-[#E5E7EB] text-xs font-bold hover:bg-[#F9FAFB] transition-all">Comparar</button>
           <button className="flex-1 h-9 rounded-lg bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-[#2563EB]/10">
             Ver Oferta <ArrowRight className="h-3 w-3" />
           </button>
        </div>
      </div>
    </article>
  );
}

function HorizontalProductCard({ group, marketId }: { group: ProductGroup; marketId: string | null }) {
  const priceObj = marketId ? group.prices.find(p => p.establishmentId === marketId) : group.prices[0];
  if (!priceObj) return null;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4 hover:border-[#2563EB]/30 transition-colors shadow-sm">
      <div className="h-20 w-20 shrink-0 bg-[#F9FAFB] rounded-lg border border-[#F3F4F6] p-2">
        <ProductImage name={group.productName} alt={group.productName} size="md" className="h-full w-full object-contain" />
      </div>
      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center w-full">
        <div className="md:col-span-2">
           <h3 className="font-bold text-sm text-[#111827] truncate">{group.productName}</h3>
           <p className="text-[11px] text-[#6B7280] font-medium">Marca · 1kg</p>
        </div>
        <div className="flex flex-col">
           <Price value={priceObj.price} size="md" className="text-[#111827] font-bold" />
           <p className="text-[10px] text-[#6B7280]">Médio: R$ {group.avg.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2 justify-end">
           <div className="hidden lg:flex flex-col items-end mr-4">
             <span className="text-[9px] font-bold uppercase text-[#16A34A]">Economia de</span>
             <span className="text-[11px] font-bold text-[#16A34A]">-R$ {(group.avg - priceObj.price).toFixed(2)}</span>
           </div>
           <button className="p-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"><Star className="h-4 w-4" /></button>
           <button className="p-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"><TrendingUp className="h-4 w-4" /></button>
           <button className="h-9 px-4 rounded-lg bg-[#2563EB]/10 text-[#2563EB] text-xs font-bold hover:bg-[#2563EB]/20 transition-all">Comparar</button>
        </div>
      </div>
    </div>
  );
}

