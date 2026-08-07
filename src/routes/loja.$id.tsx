import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileDown,
  MapPin,
  Search,
  Store as StoreIcon,
  Star,
  ChevronRight,
  TrendingDown,
  ShoppingBag,
  Calendar,
  X,
  ArrowUpDown,
  Tag,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ArrowRight
} from "lucide-react";
import { exportStoreCatalog } from "@/lib/export.functions";
import { MobileNav } from "@/components/nav/MobileNav";
import {
  getPublicStoreCatalog,
  type PublicStoreProduct,
} from "@/lib/stores-public.functions";
import { cn } from "@/lib/utils";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { StoreSkeleton } from "@/components/loja/StoreSkeleton";
import { ShareButton } from "@/components/ds/ShareButton";
import { motion, AnimatePresence } from "framer-motion";

const storeCatalogQuery = (id: string) =>
  queryOptions({
    queryKey: ["public-store", id],
    queryFn: () => getPublicStoreCatalog({ data: { id } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/loja/$id")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q.slice(0, 60) : "",
    from: typeof search.from === "string" ? search.from.slice(0, 20) : "",
  }),
  beforeLoad: async ({ location, context, params }) => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        throw redirect({
          to: "/cadastro",
          replace: true,
          search: { redirect: location.href },
        });
      }
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
      throw redirect({ to: "/login", replace: true });
    }
    void context.queryClient.prefetchQuery(storeCatalogQuery(params.id));
  },
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(storeCatalogQuery(params.id));
    } catch {
      throw notFound();
    }
  },
  pendingComponent: () => <StoreSkeleton />,
  component: () => (
    <ProtectedGate>
      <StorePage />
    </ProtectedGate>
  ),
});

function StorePage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(storeCatalogQuery(id));
  const { store, products, categories } = data;

  const initialQ = Route.useSearch().q;
  const [q, setQ] = useState(initialQ);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const raw = q.trim();
    const tokens = norm(raw).split(/\s+/).filter((t) => t.length >= 1);
    
    let list = products.slice();
    if (tokens.length > 0) {
      list = list.filter((p) => {
        const hay = norm(`${p.productName} ${p.baseName} ${p.barcode ?? ""} ${p.category ?? ""}`);
        return tokens.every((t) => hay.includes(t));
      });
    }
    return list;
  }, [products, q]);

  const groups = useMemo(() => {
    const groupsMap = new Map<string, PublicStoreProduct[]>();
    for (const p of filtered) {
      const key = p.category || "Outros";
      const arr = groupsMap.get(key) ?? [];
      arr.push(p);
      groupsMap.set(key, arr);
    }
    
    if (q.trim()) {
      return Array.from(groupsMap.entries())
        .map(([label, items]) => ({ label, items }))
        .sort((a, b) => b.items.length - a.items.length);
    }

    return categories
      .map((c) => ({ label: c.label, items: groupsMap.get(c.label) ?? [] }))
      .filter((g) => g.items.length > 0)
      .sort((a, b) => b.items.length - a.items.length);
  }, [filtered, categories, q]);

  // Scroll Spy Logic
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const catLabel = entry.target.id.replace('cat-', '').replace(/-/g, ' ');
          setActiveCategory(catLabel);
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });

    groups.forEach((group) => {
      const el = document.getElementById(`cat-${group.label.replace(/\s+/g, '-')}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [groups]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] pb-24 font-body selection:bg-blue-600/20">
      {/* Mercado Header - Ultra High Contrast */}
      <header className="bg-white border-b border-gray-100 shadow-sm relative overflow-hidden">
        {/* Subtle decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-6 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <Link to="/" className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-sm font-bold text-gray-600">
              <ChevronLeft size={18} />
              Voltar
            </Link>
            <div className="flex items-center gap-2">
               <ShareButton compact className="h-9 w-9 bg-gray-50 hover:bg-gray-100 border-none rounded-full" />
               <button 
                 onClick={() => exportStoreCatalog({ data: { storeId: id, format: "csv" } })} 
                 className="h-9 w-9 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                 title="Exportar CSV"
               >
                 <FileDown size={18} />
               </button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="relative">
               <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-white shadow-xl border border-gray-100 flex items-center justify-center overflow-hidden p-2">
                 {store.logoUrl ? (
                   <img src={store.logoUrl} alt={store.name} className="h-full w-full object-contain" />
                 ) : (
                   <StoreIcon size={48} className="text-gray-200" />
                 )}
               </div>
               <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-4 border-white">
                 <ShieldCheck size={16} strokeWidth={2.5} />
               </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-none uppercase">{store.name}</h1>
                <div className="flex items-center gap-1 bg-yellow-400 text-black px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  <Star size={10} className="fill-current" />
                  4.8
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-bold text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-blue-500" />
                  {store.neighborhood}, Feijó-AC
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={16} className="text-green-500" />
                  Aberto agora
                </span>
                <span className="flex items-center gap-1.5">
                  <Tag size={16} className="text-orange-500" />
                  {products.length} itens no catálogo
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid - More Compact */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
             <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
               <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Menor Preço</p>
               <p className="text-xl font-black text-blue-900">
                 {products.length > 0 ? `R$ ${Math.min(...products.map(p => p.price)).toFixed(2).replace('.', ',')}` : '—'}
               </p>
             </div>
             <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100/50">
               <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Categorias</p>
               <p className="text-xl font-black text-green-900">{categories.length}</p>
             </div>
             <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 hidden sm:block">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Atualização</p>
               <p className="text-xl font-black text-gray-900">Hoje</p>
             </div>
             <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100/50 hidden sm:block">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
               <p className="text-xl font-black text-green-600">Verificado</p>
             </div>
          </div>
        </div>
      </header>

      {/* Sticky Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
           <div className="flex items-center gap-3">
             <div className="relative flex-1">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
               <input 
                 value={q} 
                 onChange={e => setQ(e.target.value)}
                 className="w-full bg-gray-100 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:bg-white transition-all border border-transparent focus:border-blue-600/30"
                 placeholder="O que você está procurando?"
               />
               {q && (
                 <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 text-gray-500">
                   <X size={16} />
                 </button>
               )}
             </div>
             <button className="h-12 w-12 shrink-0 flex items-center justify-center bg-gray-100 rounded-2xl hover:bg-gray-200 text-gray-700 transition-colors">
               <ArrowUpDown size={20} />
             </button>
           </div>

           {/* Categories Horizontal Chips */}
           {!q && (
             <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
                {groups.map((g) => {
                   const isActive = activeCategory === g.label;
                   return (
                     <a 
                       key={g.label} 
                       href={`#cat-${g.label.replace(/\s+/g, '-')}`} 
                       className={cn(
                         "shrink-0 px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border",
                         isActive 
                           ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30" 
                           : "bg-white text-gray-600 border-gray-200 hover:border-blue-600/30 hover:text-blue-600"
                       )}
                     >
                       {g.label}
                     </a>
                   );
                })}
             </div>
           )}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-8">
        <AnimatePresence mode="popLayout">
          {groups.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200"
            >
              <ShoppingBag size={64} className="mx-auto text-gray-200 mb-6" />
              <h3 className="text-xl font-black text-gray-900 mb-2">PRODUTO NÃO ENCONTRADO</h3>
              <p className="text-gray-500 font-bold text-sm max-w-xs mx-auto mb-6">Infelizmente não encontramos nenhum item com "{q}" neste estabelecimento.</p>
              <button onClick={() => setQ("")} className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
                Ver catálogo completo
              </button>
            </motion.div>
          ) : groups.map((group, gIdx) => (
             <motion.section 
               key={group.label} 
               id={`cat-${group.label.replace(/\s+/g, '-')}`} 
               className="mb-12 scroll-mt-48"
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ duration: 0.5, delay: gIdx * 0.1 }}
             >
                <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                      <Tag size={20} />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                      {group.label} 
                      <span className="text-sm text-gray-400 font-bold ml-2">({group.items.length})</span>
                    </h2>
                  </div>
                  {group.items.length > 10 && !q && (
                    <button className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:text-blue-700 transition-colors">
                      Ver todos <ChevronRight size={16} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {(q ? group.items : group.items.slice(0, 10)).map((p) => (
                    <ProductCard key={p.slug} p={p} storeId={id} allItems={group.items} />
                  ))}
                </div>
             </motion.section>
          ))}
        </AnimatePresence>
      </main>

      {/* Modern Detailed Footer */}
      <footer className="max-w-6xl mx-auto px-4 mt-16 pb-12">
         <div className="bg-white rounded-[40px] p-8 sm:p-12 shadow-xl border border-gray-100 flex flex-col md:flex-row gap-10 items-center overflow-hidden relative">
           <div className="absolute top-0 left-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -ml-16 -mt-16" />
           
           <div className="shrink-0 relative">
              <div className="h-24 w-24 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.name} className="h-16 w-16 object-contain grayscale opacity-50" />
                ) : (
                  <StoreIcon size={48} />
                )}
              </div>
           </div>
           <div className="flex-1 text-center md:text-left z-10">
             <h3 className="text-2xl font-black text-gray-900 mb-3 uppercase tracking-tight">{store.name}</h3>
             <p className="text-gray-500 text-sm mb-6 leading-relaxed max-w-xl font-medium">
               Informações atualizadas diariamente. Localizado em {store.neighborhood}, {store.city}-{store.state}. 
               O PreçoCerto garante a transparência nos valores para a melhor economia da sua família.
             </p>
             <div className="flex flex-wrap justify-center md:justify-start gap-5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Endereço</span>
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <MapPin size={14} className="text-blue-500" /> {store.neighborhood}, {store.city}
                  </span>
                </div>
                <div className="flex flex-col border-l border-gray-100 pl-5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Última Coleta</span>
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Calendar size={14} className="text-green-500" /> {formatDate(products[0]?.lastDate)}
                  </span>
                </div>
             </div>
           </div>
           <button className="px-10 py-4 bg-gray-900 text-white font-black text-xs uppercase tracking-[0.25em] rounded-2xl hover:bg-black transition-all shadow-xl hover:-translate-y-1 active:scale-95">
             Localizar Loja
           </button>
         </div>
         
         <div className="text-center mt-12">
           <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em]">PreçoCerto • Feijó / Acre</p>
         </div>
      </footer>

      <MobileNav />
    </div>
  );
}

function ProductCard({ p, storeId, allItems }: { p: PublicStoreProduct; storeId: string; allItems: PublicStoreProduct[] }) {
  const isLowest = useMemo(() => {
    if (allItems.length <= 1) return false;
    const min = Math.min(...allItems.map(i => i.price));
    return p.price === min;
  }, [p.price, allItems]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
    <Link 
      to="/loja/$id/produto/$slug" 
      params={{ id: storeId, slug: p.slug }}
      search={{ q: "", from: "" }}
        className="group flex flex-col h-full bg-white rounded-3xl border border-gray-100 hover:border-blue-200 overflow-hidden hover:shadow-2xl hover:shadow-blue-600/5 transition-all duration-500 active:scale-[0.98]"
      >
        <div className="relative aspect-square bg-white flex items-center justify-center p-6 sm:p-8">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gray-50/50 scale-90 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          {p.imageUrl ? (
            <img 
              src={p.imageUrl} 
              alt={p.productName} 
              className="relative z-10 object-contain w-full h-full drop-shadow-md transition-transform duration-700 group-hover:scale-110" 
            />
          ) : (
            <div className="relative z-10 w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 group-hover:bg-blue-50 group-hover:text-blue-100 transition-colors">
              <ShoppingBag size={32} />
            </div>
          )}
          
          {isLowest && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-green-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl shadow-lg shadow-green-500/20 border-2 border-white">
              <TrendingDown size={12} strokeWidth={3} />
              Menor Preço
            </div>
          )}
        </div>

        <div className="px-5 pb-6 flex flex-col flex-1">
          <div className="flex-1 mb-4">
            <h3 className="text-sm sm:text-base font-black text-gray-900 leading-[1.3] line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
              {p.productName}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {p.brand || 'Original'}
              </span>
              <div className="h-1 w-1 rounded-full bg-gray-200" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                {p.category}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-xs font-black text-blue-600 uppercase">R$</span>
                <span className="text-2xl font-black text-gray-900 leading-none tracking-tighter">
                  {p.price.toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                {p.pricePerUnit ? (
                  <span className="text-[10px] font-bold text-gray-400">
                    {p.unitLabel} R$ {p.pricePerUnit.toFixed(2).replace('.', ',')}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-gray-500 italic">
                    Unidade
                  </span>
                )}
                <div className="h-8 w-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all duration-300">
                  <ArrowRight size={14} strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
