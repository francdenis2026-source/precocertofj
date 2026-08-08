import { createFileRoute, useNavigate, retainSearchParams } from "@tanstack/react-router";
import { 
  Search, 
  Scale, 
  PackageSearch, 
  Sparkles,
  LayoutGrid,
  Rows3,
  Trophy,
  TrendingDown,
  Info,
  Clock,
  X,
  Plus,
  ArrowRight,
  ChevronRight,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { memo, useMemo, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";
import { PageShell, PageShellContent } from "@/components/layout/PageShell";
import { Nav } from "@/components/brand/Nav";
import { Price } from "@/components/ds/Price";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product/ProductImage";
import { shortenStoreName } from "@/lib/store-name";
import { SavingsBadge } from "@/components/product/SavingsBadge";
import { filterAndSortComparisonRows } from "@/lib/comparison-search";
import { useButcherIds } from "@/hooks/useButcherIds";
import { applyButcherFilter } from "@/lib/butcher-filter";
import { ProductStoresDialog } from "@/components/product/ProductStoresDialog";
import { toast } from "sonner";

// --- Schema & Types ---

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  view: fallback(z.enum(["grid", "table"]), "grid").default("grid"),
  sort: fallback(z.string(), "relevance").default("relevance"),
});

export const Route = createFileRoute("/comparador")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [retainSearchParams(["view", "sort", "cat"])],
  },
  head: () => ({
    title: "Comparador de Preços — PreçoCerto",
    meta: [
      { name: "description", content: "Substitua dúvidas por economia. Compare preços reais nos mercados de Feijó." },
      { property: "og:title", content: "Comparador de Preços — PreçoCerto" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ComparadorPage,
});

type StoreEntry = {
  establishment_id: string;
  store_name: string;
  price: number;
  product_name: string;
  last_seen_at?: string | null;
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

// --- Helper Components ---

const ComparisonCard = memo(({ 
  item, 
  onClick, 
  onCompare, 
  isComparing 
}: { 
  item: Comparison, 
  onClick: () => void, 
  onCompare: (e: React.MouseEvent) => void,
  isComparing: boolean
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="pc-card group cursor-pointer p-0 overflow-hidden border-border/10 flex flex-col h-full bg-surface"
    >
      <div className="relative aspect-square overflow-hidden bg-muted/20">
        <ProductImage 
          src={item.image_url} 
          alt={item.display_name}
          className="w-full h-full object-contain p-6 transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 z-10">
          <button 
            onClick={onCompare}
            className={cn(
              "p-2 rounded-[var(--radius-xl)] border backdrop-blur-md transition-all",
              isComparing 
                ? "bg-brand-primary border-brand-primary text-white scale-110 shadow-lg" 
                : "bg-surface/80 border-border/20 text-muted-foreground hover:bg-surface hover:text-brand-primary"
            )}
            title={isComparing ? "Remover da comparação" : "Adicionar à comparação"}
          >
            <Scale className="h-4 w-4" />
          </button>
        </div>
        {item.savings_pct > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <SavingsBadge pct={item.savings_pct} variant="solid" size="md" />
          </div>
        )}
      </div>

      <div className="p-6 flex flex-col flex-1 gap-4">
        <div className="space-y-1">
          <p className={cn(tc.metaMuted, "uppercase tracking-widest text-[10px]")}>
            {item.category || "Geral"} • {item.size_value} {item.size_unit}
          </p>
          <h3 className={cn(tc.itemTitle, "line-clamp-2 min-h-[2.6em] group-hover:text-brand-primary transition-colors")}>
            {item.display_name}
          </h3>
        </div>

        <div className="mt-auto pt-4 border-t border-border/10 flex items-end justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">A partir de</p>
            <Price value={item.min_price} size="lg" tone="best" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Em {item.store_count} lojas</p>
            <p className="text-[11px] font-bold text-foreground truncate max-w-[120px]">
              {shortenStoreName(item.cheapest_store)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function ComparadorPage() {
  const { q, cat, view: viewMode, sort: sortKey } = Route.useSearch() as { q: string, cat: string, view: string, sort: string };
  const navigate = useNavigate({ from: "/comparador" });
  const [searchVal, setSearchVal] = useState(q);
  const [selectedItem, setSelectedItem] = useState<Comparison | null>(null);
  const [compareList, setCompareList] = useState<Comparison[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const { data: allComparisons, isLoading } = useQuery({
    queryKey: ["price-comparisons-full"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_price_comparisons", { p_limit: 1000 });
      if (error) throw error;
      return data as unknown as Comparison[];
    },
    staleTime: 60_000,
  });

  const butcherIds = useButcherIds();
  const filteredRows = useMemo(() => {
    if (!allComparisons) return [];
    let rows = applyButcherFilter(allComparisons, butcherIds, { requireMinStores: 1 });
    return filterAndSortComparisonRows(rows, q, cat) as unknown as Comparison[];
  }, [allComparisons, q, cat, butcherIds]);

  const categories = useMemo(() => {
    if (!allComparisons) return [];
    const counts = new Map<string, number>();
    allComparisons.forEach(c => {
      const cat = c.category || "Outros";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [allComparisons]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (prev: any) => ({ ...prev, q: searchVal }) });
  };

  const toggleCompare = (e: React.MouseEvent, item: Comparison) => {
    e.stopPropagation();
    setCompareList(prev => {
      const isAlready = prev.find(p => p.product_key === item.product_key);
      if (isAlready) {
        return prev.filter(p => p.product_key !== item.product_key);
      }
      if (prev.length >= 4) {
        toast.info("Você pode comparar até 4 produtos por vez.");
        return prev;
      }
      return [...prev, item];
    });
  };

  return (
    <PageShell className="bg-[var(--bg-base)]">
      <Nav />
      
      <PageShellContent className="overflow-x-hidden">
        {/* --- Hero Section --- */}
        <section className="relative pt-20 pb-12 px-6 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--pc-brand-gold-glow),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.05),transparent_40%)]" />
          
          <div className="max-w-7xl mx-auto space-y-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inteligência PreçoCerto</span>
              </div>
              <h1 className={cn(tc.h1, "text-4xl md:text-6xl font-black tracking-tight leading-none text-brand-secondary")}>
                Comparador de <span className="text-brand-primary">Preços</span>
              </h1>
              <p className={cn(tc.lead, "max-w-2xl mx-auto")}>
                Economize tempo e dinheiro comparando os preços reais praticados em todos os estabelecimentos de Feijó.
              </p>
            </motion.div>

            {/* --- Search Bar --- */}
            <motion.form 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSearch}
              className="max-w-3xl mx-auto relative group"
            >
              <div className="relative flex items-center p-2 bg-surface border border-border/40 rounded-[var(--radius-3xl)] shadow-2xl shadow-black/5 ring-4 ring-transparent group-focus-within:ring-brand-primary/5 transition-all">
                <Search className="absolute left-6 h-5 w-5 text-muted-foreground" />
                <input 
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder="O que você quer comparar hoje?"
                  className="w-full bg-transparent pl-14 pr-6 py-4 text-lg font-medium outline-none placeholder:text-muted-foreground/50"
                />
                <Button type="submit" className="pc-button-primary rounded-full px-8 py-6 h-auto">
                  Buscar
                </Button>
              </div>
            </motion.form>

            {/* --- Quick Categories --- */}
            <div className="flex flex-wrap justify-center gap-3">
               {categories.slice(0, 6).map(([name, count]) => (
                 <button
                   key={name}
                   onClick={() => navigate({ search: (prev: any) => ({ ...prev, cat: name === cat ? "" : name }) })}
                   className={cn(
                     "px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all",
                     cat === name 
                       ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" 
                       : "bg-surface border border-border/20 text-muted-foreground hover:border-brand-primary/50 hover:text-brand-primary"
                   )}
                 >
                   {name} <span className="opacity-50 ml-1">({count})</span>
                 </button>
               ))}
            </div>
          </div>
        </section>

        {/* --- Results Section --- */}
        <section className="max-w-7xl mx-auto px-6 py-12 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h2 className={tc.h2}>Resultados Disponíveis</h2>
              <p className={tc.metaMuted}>Encontramos {filteredRows.length} itens correspondentes em Feijó</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 bg-surface border border-border/20 p-1 rounded-[var(--radius-xl)]">
                 <button 
                   onClick={() => navigate({ search: (prev: any) => ({ ...prev, view: "grid" }) })}
                   className={cn("p-2 rounded-lg transition-all", viewMode === "grid" ? "bg-brand-primary/10 text-brand-primary" : "text-muted-foreground hover:bg-muted")}
                 >
                   <LayoutGrid className="h-4 w-4" />
                 </button>
                 <button 
                   onClick={() => navigate({ search: (prev: any) => ({ ...prev, view: "table" }) })}
                   className={cn("p-2 rounded-lg transition-all", viewMode === "table" ? "bg-brand-primary/10 text-brand-primary" : "text-muted-foreground hover:bg-muted")}
                 >
                   <Rows3 className="h-4 w-4" />
                 </button>
              </div>

              <select 
                value={sortKey}
                onChange={(e) => navigate({ search: (prev: any) => ({ ...prev, sort: e.target.value }) })}
                className="bg-surface border border-border/20 rounded-[var(--radius-xl)] px-4 py-2.5 text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-brand-primary/50 transition-colors"
              >
                <option value="relevance">Relevância</option>
                <option value="price-asc">Menor Preço</option>
                <option value="savings-desc">Maior Economia</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
               <Button 
                 variant="outline" 
                 size="sm" 
                 className="rounded-full text-[11px] font-black uppercase tracking-wider h-10 px-6 border-border/40 hover:border-brand-primary/50"
                 onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    const q = params.get('q') || '';
                    const cat = params.get('cat') || '';
                    window.open(`/api/export/comparison?q=${encodeURIComponent(q)}&cat=${encodeURIComponent(cat)}`, '_blank');
                 }}
               >
                 <ArrowUpRight className="mr-2 h-4 w-4" />
                 Exportar PDF
               </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="h-[420px] rounded-[var(--radius-3xl)] bg-muted/20 animate-pulse" />
               ))}
            </div>
          ) : filteredRows.length > 0 ? (
            <div className={cn(
              "grid gap-6",
              viewMode === "grid" 
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                : "grid-cols-1"
            )}>
              {filteredRows.map((item) => (
                <ComparisonCard 
                  key={item.product_key} 
                  item={item} 
                  isComparing={compareList.some(p => p.product_key === item.product_key)}
                  onCompare={(e) => toggleCompare(e, item)}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4">
              <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <PackageSearch className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground">Tente ajustar sua busca ou mudar os filtros de categoria.</p>
                <Button 
                  variant="outline" 
                  onClick={() => navigate({ search: { q: "", cat: "" } })}
                  className="mt-4 rounded-full"
                >
                  Limpar todos os filtros
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* --- Floating Comparison Tray --- */}
        <AnimatePresence>
          {compareList.length > 0 && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6 pointer-events-none"
            >
              <div className="bg-brand-secondary/95 backdrop-blur-xl rounded-[var(--radius-2xl)] p-4 border border-white/10 shadow-2xl flex items-center justify-between gap-6 pointer-events-auto">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                  {compareList.map((item) => (
                    <motion.div 
                      key={item.product_key}
                      layout
                      className="relative group shrink-0"
                    >
                      <div className="h-12 w-12 rounded-[var(--radius-xl)] bg-white/10 border border-white/10 p-1.5">
                        <ProductImage src={item.image_url} alt={item.display_name} className="h-full w-full object-contain" />
                      </div>
                      <button 
                        onClick={(e) => toggleCompare(e, item)}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-danger text-white flex items-center justify-center shadow-lg scale-0 group-hover:scale-100 transition-transform"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </motion.div>
                  ))}
                  {Array.from({ length: Math.max(0, 2 - compareList.length) }).map((_, i) => (
                    <div key={i} className="h-12 w-12 rounded-[var(--radius-xl)] border border-white/5 border-dashed flex items-center justify-center text-white/20">
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">Comparar</p>
                    <p className="text-xs text-white font-bold">{compareList.length} {compareList.length === 1 ? 'item' : 'itens'}</p>
                  </div>
                  <Button 
                    disabled={compareList.length < 2}
                    onClick={() => setShowComparison(true)}
                    className="pc-button-primary rounded-xl h-12 px-6"
                  >
                    Comparar Agora
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Product Details Modal --- */}
        <ProductStoresDialog 
          open={!!selectedItem}
          onOpenChange={(open) => !open && setSelectedItem(null)}
          productName={selectedItem?.display_name || ""}
          category={selectedItem?.category}
          sizeLabel={selectedItem ? `${selectedItem.size_value} ${selectedItem.size_unit}` : null}
          stores={selectedItem?.stores.map(s => ({
            establishment_id: s.establishment_id,
            store_name: s.store_name,
            price: s.price,
          })) || []}
          detailSlug={selectedItem?.catalog_slug}
        />

        {/* --- Side-by-Side Comparison Modal --- */}
        <AnimatePresence>
          {showComparison && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-brand-secondary/40 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
              >
                <button 
                  onClick={() => setShowComparison(false)}
                  className="absolute top-6 right-6 h-10 w-10 rounded-full bg-muted/50 hover:bg-danger/10 hover:text-danger flex items-center justify-center transition-all z-10"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="p-8 md:p-12 border-b border-border/10">
                  <div className="flex items-center gap-4 text-brand-primary mb-4">
                    <Scale className="h-6 w-6" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Comparativo Detalhado</span>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight text-brand-secondary">
                    Duelo de <span className="text-brand-primary">Preços</span>
                  </h2>
                </div>

                <div className="flex-1 overflow-x-auto p-8 md:p-12">
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-8 min-w-[800px]">
                      {compareList.map((item) => (
                        <div key={item.product_key} className="space-y-8">
                           <div className="space-y-4">
                             <div className="aspect-square rounded-3xl bg-muted/20 p-6 flex items-center justify-center relative">
                               <ProductImage src={item.image_url} alt={item.display_name} className="h-full w-full object-contain" />
                               {item.savings_pct > 0 && (
                                 <div className="absolute top-4 right-4">
                                   <SavingsBadge pct={item.savings_pct} />
                                 </div>
                               )}
                             </div>
                             <h3 className="font-bold text-lg leading-tight line-clamp-2 h-[2.8em]">{item.display_name}</h3>
                             <Price value={item.min_price} size="xl" tone="best" />
                           </div>

                           <div className="space-y-6">
                             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/10 pb-2">Preços por loja</p>
                             <div className="space-y-4">
                               {item.stores.slice(0, 5).map((s, i) => (
                                 <div key={i} className="flex items-center justify-between gap-4">
                                   <div className="min-w-0">
                                     <p className="text-xs font-bold truncate text-foreground/80">{shortenStoreName(s.store_name)}</p>
                                   </div>
                                   <Price value={s.price} size="sm" />
                                 </div>
                               ))}
                             </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="p-8 bg-muted/10 border-t border-border/10 flex items-center justify-between">
                   <p className="text-sm text-muted-foreground">Analise os estabelecimentos e escolha o melhor custo-benefício.</p>
                   <Button onClick={() => setShowComparison(false)} className="pc-button-primary rounded-full px-8">
                     Fechar Comparação
                   </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </PageShellContent>
    </PageShell>
  );
}
