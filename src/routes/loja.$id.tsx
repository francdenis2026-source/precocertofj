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
  ArrowRight,
  Star,
  ChevronRight,
  TrendingDown,
  ShoppingBag,
  Info,
  Calendar,
  X,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { exportStoreCatalog } from "@/lib/export.functions";
import { toast } from "sonner";
import { MobileNav } from "@/components/nav/MobileNav";
import {
  getPublicStoreCatalog,
  type PublicStoreProduct,
} from "@/lib/stores-public.functions";
import { cn } from "@/lib/utils";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { StoreSkeleton } from "@/components/loja/StoreSkeleton";
import { Price } from "@/components/ds/Price";
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
    if (q.trim()) return [{ label: "Resultados da busca", items: filtered }];
    
    const groupsMap = new Map<string, PublicStoreProduct[]>();
    for (const p of filtered) {
      const key = p.category || "Outros";
      const arr = groupsMap.get(key) ?? [];
      arr.push(p);
      groupsMap.set(key, arr);
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
    <div className="min-h-screen bg-[#F1F3F6] text-[#1A1A1A] pb-24 font-body selection:bg-[#2563EB]/20">
      {/* Mercado Livre Style Header */}
      <header className="bg-[#FFE600] text-[#1A1A1A] pt-4 pb-2 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ArrowLeft size={20} />
              <span className="font-bold text-sm">Voltar</span>
            </Link>
            <div className="flex items-center gap-4">
               <ShareButton compact className="bg-transparent border-none hover:bg-black/5" />
               <button onClick={() => exportStoreCatalog({ data: { id } })} className="p-2 hover:bg-black/5 rounded-full">
                 <FileDown size={20} />
               </button>
            </div>
          </div>
          
          <div className="flex items-start gap-4 py-2">
            <div className="relative shrink-0">
               {store.logoUrl ? (
                 <img src={store.logoUrl} alt={store.name} className="h-16 w-16 rounded-xl bg-white shadow-md object-contain p-1" />
               ) : (
                 <div className="h-16 w-16 rounded-xl bg-white shadow-md flex items-center justify-center text-gray-400">
                   <StoreIcon size={32} />
                 </div>
               )}
               <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 border-2 border-[#FFE600]">
                 <Check size={10} strokeWidth={4} />
               </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black truncate leading-tight tracking-tight uppercase">{store.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] font-bold opacity-70">
                <span className="flex items-center gap-1">
                  <Star size={12} className="fill-current text-blue-700" />
                  4.8 <span className="opacity-60">(1.2k avaliações)</span>
                </span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {store.neighborhood}, Feijó-AC
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Modern Search & Filter Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
           <div className="relative flex-1">
             <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
               value={q} 
               onChange={e => setQ(e.target.value)}
               className="w-full bg-gray-100 rounded-full py-2.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:bg-white transition-all border border-transparent focus:border-blue-600"
               placeholder="Buscar no catálogo da loja..."
             />
             {q && (
               <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-200 text-gray-500">
                 <X size={16} />
               </button>
             )}
           </div>
           <button className="h-10 w-10 shrink-0 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 text-gray-700 transition-colors">
             <ArrowUpDown size={18} />
           </button>
        </div>

        {/* Categories Chips */}
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
             {groups.map((g) => {
                const isActive = activeCategory === g.label;
                return (
                  <a 
                    key={g.label} 
                    href={`#cat-${g.label.replace(/\s+/g, '-')}`} 
                    className={cn(
                      "shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border",
                      isActive 
                        ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" 
                        : "bg-white text-gray-600 border-gray-200 hover:border-blue-600 hover:text-blue-600"
                    )}
                  >
                    {g.label}
                  </a>
                );
             })}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-10">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Itens</p>
             <p className="text-xl font-black text-blue-700">{products.length}</p>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Último Update</p>
             <p className="text-xl font-black text-[#1A1A1A] flex items-center gap-2">
               {formatDate(products[0]?.lastDate).split('/')[0]} <span className="text-sm opacity-30">Hoje</span>
             </p>
           </div>
           <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 col-span-2">
             <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Performance</p>
                <TrendingDown size={14} className="text-green-500" />
             </div>
             <p className="text-sm font-bold text-green-600">Preços mais baixos que a média da cidade</p>
           </div>
        </div>

        {/* Catalog Sections */}
        <AnimatePresence mode="popLayout">
          {groups.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"
            >
              <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm px-8">Ops! Nenhum produto encontrado com "{q}" nesta loja.</p>
              <button onClick={() => setQ("")} className="mt-4 text-blue-600 font-bold text-sm">Ver todo o catálogo</button>
            </motion.div>
          ) : groups.map((group, gIdx) => (
             <motion.section 
               key={group.label} 
               id={`cat-${group.label.replace(/\s+/g, '-')}`} 
               className="scroll-mt-40"
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ delay: gIdx * 0.05 }}
             >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-[#1A1A1A] flex items-center gap-2 uppercase tracking-tight">
                    <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
                    {group.label} 
                    <span className="text-[10px] text-gray-400 font-bold ml-1">({group.items.length})</span>
                  </h2>
                  {group.items.length > 8 && (
                    <button className="text-[11px] font-black text-blue-600 uppercase tracking-wider flex items-center gap-1 hover:underline">
                      Ver tudo <ChevronRight size={14} />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {group.items.slice(0, 8).map((p) => (
                    <ProductCard key={p.slug} p={p} storeId={id} allItems={group.items} />
                  ))}
                </div>
             </motion.section>
          ))}
        </AnimatePresence>
      </main>

      {/* Footer Details */}
      <footer className="max-w-6xl mx-auto px-4 mt-20 pb-12">
         <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
           <div className="shrink-0">
              <div className="h-20 w-20 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
                <StoreIcon size={40} />
              </div>
           </div>
           <div className="flex-1">
             <h3 className="text-xl font-black text-[#1A1A1A] mb-2 uppercase tracking-tight">{store.name} — Unidade Feijó</h3>
             <p className="text-gray-500 text-sm mb-4 leading-relaxed max-w-lg">
               Este estabelecimento é um parceiro do PreçoCerto. Os valores são coletados diariamente para garantir a melhor economia para sua casa em Feijó-AC.
             </p>
             <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <span className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <MapPin size={14} /> {store.neighborhood}, {store.city} - {store.state}
                </span>
                <span className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <Calendar size={14} /> Atualizado {formatDate(products[0]?.lastDate)}
                </span>
             </div>
           </div>
           <button className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 active:scale-95">
             Como chegar
           </button>
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
    <Link 
      to="/loja/$id/produto/$slug" 
      params={{ id: storeId, slug: p.slug }}
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-blue-600/30 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 flex flex-col active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] bg-gray-50 p-4 flex items-center justify-center">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.productName} className="object-contain w-full h-full drop-shadow-sm transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <ShoppingBag size={32} className="text-gray-200" />
        )}
        
        {isLowest && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500 text-white text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg shadow-md">
            <TrendingDown size={10} strokeWidth={3} />
            Melhor Preço
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1 min-h-[40px]">
          <h3 className="text-[13px] font-bold text-[#333] leading-tight line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {p.productName}
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate mb-2">
            {p.brand || 'Marca Local'}
          </p>
        </div>

        <div className="mt-2 pt-2 border-t border-gray-50 flex items-end justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] font-black text-blue-600">R$</span>
              <span className="text-lg font-black text-[#1A1A1A] leading-none tracking-tight">
                {p.price.toFixed(2).replace('.', ',')}
              </span>
            </div>
            {p.pricePerUnit && (
              <span className="text-[9px] font-bold text-gray-400 mt-0.5">
                {p.unitLabel} {p.pricePerUnit.toFixed(2).replace('.', ',')}
              </span>
            )}
          </div>
          
          <div className="flex gap-1">
             <div className="h-6 w-6 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <ChevronRight size={14} strokeWidth={3} />
             </div>
          </div>
        </div>
      </div>
    </Link>
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
