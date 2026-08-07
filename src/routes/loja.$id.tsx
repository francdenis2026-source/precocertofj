import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileDown,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Save,
  Scale,
  Search,
  Share2,
  SlidersHorizontal,
  Store as StoreIcon,
  ShoppingBag,
  Trash2,
  X,
  AlertTriangle,
  Download,
  History,
  TrendingDown,
  Sparkles,
  Clock3,
  ArrowRight,
  Bell,
  Star
} from "lucide-react";
import { exportStoreCatalog } from "@/lib/export.functions";
import { toast } from "sonner";
import { MobileNav } from "@/components/nav/MobileNav";
import { SwipeRow } from "@/components/SwipeRow";
import {
  getPublicStoreCatalog,
  type PublicStoreProduct,
} from "@/lib/stores-public.functions";
import { cn } from "@/lib/utils";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { StoreSkeleton } from "@/components/loja/StoreSkeleton";
import { Price } from "@/components/ds/Price";
import { ShareButton } from "@/components/ds/ShareButton";
import { ContamigosLogo } from "@/components/brand/ContamigosLogo";

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
    const observers = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveCategory(entry.target.id.replace('cat-', '').replace(/-/g, ' '));
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });

    groups.forEach((group) => {
      const el = document.getElementById(`cat-${group.label.replace(/\s+/g, '-')}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [groups]);

  const featured = useMemo(() => {
    const list = [...products].sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
    return list.slice(0, 8);
  }, [products]);

  return (
    <div className="min-h-[100svh] bg-[#0F1420] text-foreground pb-20 selection:bg-primary/30">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Voltar para o início
        </Link>

        {/* Premium Store Header */}
        <header className="relative mb-8 rounded-[32px] border border-white/5 bg-gradient-to-br from-[#1A2640] to-[#0A142F] p-8 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
             <div className="relative group">
               <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
               {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.name} className="relative h-24 w-24 rounded-3xl border border-white/10 bg-white object-contain shadow-2xl" />
               ) : (
                  <div className="relative h-24 w-24 rounded-3xl bg-[#0F1A30] border border-white/5 flex items-center justify-center text-primary shadow-2xl">
                    <StoreIcon size={40} />
                  </div>
               )}
             </div>

             <div className="flex-1 text-center md:text-left">
               <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                 <h1 className="text-3xl font-black text-white tracking-tight">{store.name}</h1>
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider text-emerald-400 w-fit mx-auto md:mx-0">
                   <Check size={12} strokeWidth={3} /> Verificada
                 </span>
               </div>
               
               <p className="flex items-center justify-center md:justify-start gap-2 text-white/50 text-sm mb-6">
                 <MapPin size={14} className="text-primary" /> {store.neighborhood} · {store.city}, {store.state}
               </p>

               <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto md:mx-0">
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Produtos</p>
                    <p className="text-xl font-black text-white">{products.length}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Categorias</p>
                    <p className="text-xl font-black text-white">{categories.length}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Menor Preço</p>
                    <p className="text-xl font-black text-[var(--brand-primary)]">R$ {Math.min(...products.map(p => p.price)).toFixed(2).replace('.', ',')}</p>
                  </div>
               </div>
             </div>

             <div className="flex flex-col gap-2">
               <ShareButton size="lg" title={store.name} className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-2xl" />
               <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold text-sm hover:text-white hover:bg-white/10 transition-all">
                 <FileDown size={18} /> Exportar
               </button>
             </div>
          </div>

          {/* Recent Updates Carousel - simplified as requested to be integrated */}
          <div className="mt-12 pt-8 border-t border-white/5">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2">
                 <Clock3 size={14} /> Últimas Atualizações
               </h3>
               <span className="text-[10px] text-white/30 font-bold">Arraste para ver mais →</span>
             </div>
             <SwipeRow>
               {featured.map((p) => (
                  <div key={p.slug} className="shrink-0 w-48 bg-white/5 border border-white/5 rounded-2xl p-3 hover:border-primary/30 transition-all">
                    <div className="aspect-square rounded-xl bg-white/5 mb-3 overflow-hidden flex items-center justify-center p-2">
                       {p.imageUrl ? <img src={p.imageUrl} alt={p.productName} className="object-contain w-full h-full" /> : <Sparkles className="text-white/10" />}
                    </div>
                    <h4 className="text-[12px] font-bold text-white line-clamp-1 mb-1">{p.productName}</h4>
                    <div className="flex items-center justify-between">
                       <Price value={p.price} size="sm" className="font-black text-primary" />
                       <span className="text-[9px] text-white/30 font-bold uppercase">{formatDate(p.lastDate)}</span>
                    </div>
                  </div>
               ))}
             </SwipeRow>
          </div>
        </header>

        {/* Sticky Anchor Navigation */}
        <nav className="sticky top-0 z-40 bg-[#0F1420]/95 backdrop-blur-xl py-4 mb-8 -mx-4 px-4 border-b border-white/5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
             {groups.map((g) => {
                const isActive = activeCategory === g.label;
                return (
                  <a 
                    key={g.label} 
                    href={`#cat-${g.label.replace(/\s+/g, '-')}`} 
                    className={cn(
                      "shrink-0 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all border",
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(212,175,55,0.3)]" 
                        : "bg-[#1A2640] text-white/60 border-white/5 hover:text-white hover:bg-[#253450]"
                    )}
                  >
                    {g.label} <span className={cn("ml-1 opacity-50", isActive ? "text-primary-foreground" : "text-white")}>({g.items.length})</span>
                  </a>
                );
             })}
          </div>
        </nav>

        {/* Fixed Search Bar & Filters */}
        <div className="relative mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary" size={20} />
          <input 
            value={q} 
            onChange={e => setQ(e.target.value)}
            className="w-full bg-[#1A2640] rounded-[24px] py-5 pl-16 pr-8 text-white font-semibold placeholder:text-white/20 border border-white/5 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-2xl"
            placeholder="O que você está procurando nesta loja?"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/5 text-white/40"><X size={20} /></button>
          )}
        </div>

        {/* Categorized Content Sections */}
        <div className="space-y-20">
          {groups.length === 0 ? (
            <div className="text-center py-20 bg-white/5 rounded-[32px] border border-dashed border-white/10">
              <Search size={48} className="mx-auto text-white/10 mb-4" />
              <p className="text-white/40 font-bold uppercase tracking-widest">Nenhum produto encontrado na busca</p>
            </div>
          ) : groups.map((group) => (
             <section key={group.label} id={`cat-${group.label.replace(/\s+/g, '-')}`} className="scroll-mt-32">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <span className="text-primary">{getCategoryEmoji(group.label)}</span>
                    {group.label} 
                    <span className="text-sm text-white/30 font-bold uppercase tracking-widest ml-2">({group.items.length})</span>
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.items.slice(0, 6).map((p) => {
                    const isLowest = group.items.length > 1 && p.price === Math.min(...group.items.map(i => i.price));
                    return (
                      <ProductCard key={p.slug} p={p} storeId={id} showLowestBadge={isLowest} />
                    );
                  })}
                </div>

                {group.items.length > 6 && (
                   <button className="mt-8 w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-[0.25em] text-primary hover:bg-white/10 transition-all active:scale-[0.98]">
                     Ver todos os {group.items.length} produtos de {group.label} <ArrowRight size={14} className="inline ml-2" />
                   </button>
                )}
             </section>
          ))}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}

function ProductCard({ p, storeId, showLowestBadge }: { p: PublicStoreProduct; storeId: string, showLowestBadge?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/5 bg-gradient-to-br from-[#1A2640] to-[#121D35] p-5 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-primary/5 hover:border-primary/20 group">
      {showLowestBadge && (
        <div className="absolute top-0 right-0 z-10">
           <div className="bg-primary text-[9px] font-black uppercase tracking-tighter text-primary-foreground px-3 py-1 rounded-bl-xl shadow-lg">
             Menor preço
           </div>
        </div>
      )}

      <div className="flex gap-5">
        <Link 
          to="/loja/$id/produto/$slug" 
          params={{ id: storeId, slug: p.slug }} 
          className="relative w-20 h-20 rounded-2xl bg-white/5 p-2 shrink-0 flex items-center justify-center overflow-hidden border border-white/5"
        >
           {p.imageUrl ? (
             <img src={p.imageUrl} alt={p.productName} className="object-contain w-full h-full drop-shadow-md transition-transform duration-500 group-hover:scale-110" />
           ) : (
             <Sparkles size={24} className="text-white/10" />
           )}
        </Link>

        <div className="flex-1 min-w-0 flex flex-col">
          <Link 
            to="/loja/$id/produto/$slug" 
            params={{ id: storeId, slug: p.slug }}
            className="flex-1"
          >
            <h3 className="font-bold text-[15px] text-white leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
              {p.productName}
            </h3>
            <p className="text-[11px] font-medium text-white/40 flex items-center gap-2">
              {p.category} {p.pricePerUnit && <span className="opacity-50">· {p.unitLabel} R$ {p.pricePerUnit.toFixed(2).replace('.', ',')}</span>}
            </p>
          </Link>

          <div className="mt-3 flex items-end justify-between">
            <div className="space-y-0.5">
               <Price value={p.price} size="lg" className="text-xl font-black text-primary leading-none" />
               <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
                 {formatDate(p.lastDate)}
               </p>
            </div>

            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
               <button className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                 <Bell size={14} />
               </button>
               <button className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                 <History size={14} />
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
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

function getCategoryEmoji(cat: string): string {
  const norm = cat.toLowerCase();
  if (norm.includes('biscoito')) return '🍪';
  if (norm.includes('bebida')) return '🥤';
  if (norm.includes('higiene') || norm.includes('limpeza')) return '🧴';
  if (norm.includes('carne') || norm.includes('frigor')) return '🥩';
  if (norm.includes('fruta') || norm.includes('verdura')) return '🍎';
  if (norm.includes('mercearia')) return '🥫';
  if (norm.includes('padaria')) return '🥖';
  if (norm.includes('farmacia')) return '💊';
  return '📦';
}
