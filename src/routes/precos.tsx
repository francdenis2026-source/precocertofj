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
    <div className="min-h-screen bg-[#F5F7FA] text-[#111827] font-inter">
      <SiteHeader variant="solid" />
      
      {/* 2-Column Body */}
      <div className="mx-auto w-full max-w-[1600px] flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
        
        {/* Left Sidebar: Markets List */}
        <aside className="w-full md:w-[360px] lg:w-[380px] bg-white border-r border-[#E5E7EB] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#E5E7EB] bg-white sticky top-0 z-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">Estabelecimentos</h2>
              <span className="text-[10px] font-bold text-[#2563EB] bg-[#2563EB]/10 px-2 py-0.5 rounded-full">{markets.length}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
              <input 
                type="text" 
                placeholder="Filtrar mercados..." 
                className="w-full pl-9 pr-4 py-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-2">
            {isMarketsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-[#F9FAFB] animate-pulse rounded-xl border border-[#E5E7EB]" />
              ))
            ) : (
              markets.map(m => (
                <button
                  key={m.id}
                  onClick={() => selectMarket(m.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden",
                    activeMarketId === m.id 
                      ? "bg-white border-[#2563EB] shadow-md ring-1 ring-[#2563EB]" 
                      : "bg-white border-[#E5E7EB] hover:border-[#2563EB]/40 hover:bg-[#F9FAFB]"
                  )}
                >
                  <div className="flex gap-3 relative z-10">
                    <div className="h-12 w-12 shrink-0 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center overflow-hidden">
                      {m.logoUrl ? (
                         <img src={m.logoUrl} alt={m.name} className="h-full w-full object-contain" />
                      ) : (
                         <Store className="h-5 w-5 text-[#9CA3AF]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm truncate group-hover:text-[#2563EB] transition-colors">{m.name}</h3>
                        {m.maxSavings > 0 && <Badge variant="savingsSoft" size="sm" className="bg-[#16A34A]/10 text-[#16A34A] border-none">-{m.maxSavings}%</Badge>}
                      </div>
                      <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">{m.neighborhood || "Centro"}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-bold text-[#111827] flex items-center gap-1">
                          <Package className="h-3 w-3" /> {m.productsCount || 0} produtos
                        </span>
                        <span className="text-[10px] font-bold text-[#6B7280] flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Atualizado hoje
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
        <main className="flex-1 bg-[#F5F7FA] overflow-y-auto p-6 space-y-6">
          
          {/* Market Hero/Banner */}
          {activeMarket && (
            <section className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
              <div className="h-32 bg-[#F3F4F6] relative">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200" 
                  alt="Fachada" 
                  className="w-full h-full object-cover opacity-60" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>
              <div className="px-8 pb-8 -mt-10 relative z-10 flex flex-col md:flex-row gap-6">
                <div className="h-24 w-24 rounded-2xl bg-white border-2 border-white shadow-xl flex items-center justify-center overflow-hidden shrink-0">
                   {activeMarket.logoUrl ? <img src={activeMarket.logoUrl} alt="" className="h-full w-full object-contain" /> : <Store className="h-10 w-10 text-[#2563EB]" />}
                </div>
                <div className="flex-1 pt-10">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                     <div className="space-y-1">
                       <h1 className="text-3xl font-bold tracking-tight">{activeMarket.name}</h1>
                       <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#6B7280]">
                         <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {activeMarket.city || "Feijó, AC"}</span>
                         <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 08:00 às 19:00</span>
                         <span className="flex items-center gap-1.5 text-[#16A34A] font-bold">Aberto agora</span>
                       </div>
                     </div>
                     <div className="flex items-center gap-3">
                       <button className="h-10 px-4 rounded-xl border border-[#E5E7EB] text-sm font-bold hover:bg-[#F9FAFB] transition-all flex items-center gap-2">
                         <Star className="h-4 w-4" /> Favoritar
                       </button>
                       <Link 
                         to="/loja/$id" 
                         params={{ id: activeMarket.id }}
                         className="h-10 px-6 rounded-xl bg-[#2563EB] text-white text-sm font-bold hover:bg-[#1D4ED8] transition-all flex items-center gap-2 shadow-lg shadow-[#2563EB]/20"
                       >
                         Ver Mercado <ChevronRight className="h-4 w-4" />
                       </Link>
                     </div>
                   </div>
                </div>
              </div>
            </section>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Produtos Disponíveis" value={String(activeMarket?.productsCount || 0)} icon={<Package className="h-4 w-4" />} />
            <StatCard label="Categorias" value={String(activeMarket?.topCategories?.length || 0)} icon={<Filter className="h-4 w-4" />} />
            <StatCard label="Economia Média" value={`${activeMarket?.maxSavings || 0}%`} icon={<TrendingDown className="h-4 w-4" />} tone="savings" />
            <StatCard label="Preço Mínimo" value={activeMarket?.minPrice ? `R$ ${activeMarket.minPrice.toFixed(2)}` : "—"} icon={<TrendingUp className="h-4 w-4" />} tone="offers" />
          </div>

          {/* Featured/Results Area */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Produtos em Destaque</h2>
              <div className="flex items-center gap-2 p-1 bg-white border border-[#E5E7EB] rounded-lg">
                <button className="p-1.5 rounded bg-[#F3F4F6] text-[#2563EB]"><LayoutGrid className="h-4 w-4" /></button>
                <button className="p-1.5 rounded text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"><Rows3 className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Grid 4 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {isSearchLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-80 bg-white rounded-2xl border border-[#E5E7EB] animate-pulse" />
                ))
              ) : filteredGroups.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-[#E5E7EB]">
                  <p className="font-bold text-[#111827]">Nenhum produto encontrado</p>
                  <p className="text-sm text-[#6B7280]">Tente outro termo ou limpe os filtros.</p>
                </div>
              ) : (
                filteredGroups.slice(0, 4).map((g, i) => (
                  <ProductCard key={g.productName} group={g} marketId={activeMarketId} />
                ))
              )}
            </div>
          </div>

          {/* Full List Area */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Lista Completa</h2>
            <div className="space-y-3">
              {filteredGroups.slice(4).map(g => (
                <HorizontalProductCard key={g.productName} group={g} marketId={activeMarketId} />
              ))}
            </div>
          </div>

        </main>
      </div>
    </div>
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

