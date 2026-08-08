import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileDown,
  MapPin,
  Store as StoreIcon,
  Star,
  ChevronRight,
  ShoppingBag,
  Calendar,
  X,
  ArrowUpDown,
  Tag,
  Clock,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
  TrendingDown,
  Search
} from "lucide-react";
import { exportStoreCatalog } from "@/lib/export.functions";
import {
  getPublicStoreCatalog,
  type PublicStoreProduct,
} from "@/lib/stores-public.functions";
import { cn } from "@/lib/utils";
import { ProtectedGate } from "@/components/auth/ProtectedGate";
import { StoreSkeleton } from "@/components/loja/StoreSkeleton";
import { ShareButton } from "@/components/ds/ShareButton";
import { motion, AnimatePresence } from "framer-motion";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/brand/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ProductImage } from "@/components/ds/ProductImage";
import { Price } from "@/components/ds/Price";

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

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

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
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-24 selection:bg-[var(--brand-primary)]/20">
      <SiteHeader variant="solid" />
      
      {/* Store Header Section */}
      <header className="relative pt-12 pb-20 overflow-hidden">
        {/* Abstract Background Decor */}
        <div className="absolute inset-0 -z-10 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--bg-base)]" />
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1600" 
            alt="" 
            className="w-full h-full object-cover grayscale"
          />
        </div>

        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <Link to="/estabelecimentos" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-12">
            <ChevronLeft size={18} />
            Todos os mercados
          </Link>

          <div className="flex flex-col md:flex-row gap-8 items-end">
            <div className="relative">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-[var(--radius-2xl)] bg-white p-3 shadow-2xl border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.name} className="h-full w-full object-contain" />
                ) : (
                  <StoreIcon size={64} className="text-slate-200" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[var(--success)] text-white p-2 rounded-xl shadow-lg border-4 border-[var(--bg-base)]">
                <ShieldCheck size={20} strokeWidth={2.5} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-4 mb-3">
                <h1 className="text-[clamp(2rem,5vw,3rem)] font-black tracking-tight leading-none uppercase">{store.name}</h1>
                <div className="flex items-center gap-1.5 bg-[var(--brand-accent)] text-black px-3 py-1 rounded-xl text-[12px] font-black uppercase tracking-wider">
                  <Star size={12} className="fill-current" />
                  4.8 PREMIUM
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-[15px] font-bold text-[var(--text-secondary)]">
                <span className="flex items-center gap-2">
                  <MapPin size={18} className="text-[var(--brand-primary)]" />
                  {store.neighborhood}, Feijó-AC
                </span>
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
                  <span className="text-[var(--success)]">Aberta Agora</span>
                </span>
                <span className="flex items-center gap-2">
                  <Tag size={18} className="text-[var(--brand-accent)]" />
                  {products.length} itens catalogados
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ShareButton className="pc-button-secondary h-12 px-6" />
              <button 
                onClick={() => exportStoreCatalog({ data: { storeId: id, format: "csv" } })}
                className="pc-button-secondary h-12 w-12 p-0 flex items-center justify-center"
                title="Exportar CSV"
              >
                <FileDown size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Filters & Nav */}
      <div className="sticky top-20 z-30 bg-[color-mix(in_oklab,var(--bg-base)_86%,transparent)] backdrop-blur-xl border-y border-[var(--border-subtle)]">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="relative flex-1 w-full lg:w-auto">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input 
                value={q} 
                onChange={e => setQ(e.target.value)}
                className="w-full bg-[var(--bg-surface)] rounded-2xl py-4 pl-12 pr-12 text-[15px] font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 border border-[var(--border-subtle)] focus:border-[var(--brand-primary)]/40 transition-all"
                placeholder="Pesquisar neste mercado..."
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)]">
                  <X size={18} />
                </button>
              )}
            </div>

            {!q && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 -mb-1 lg:pb-0 lg:mb-0">
                 {groups.map((g) => (
                    <a 
                      key={g.label} 
                      href={`#cat-${g.label.replace(/\s+/g, '-')}`} 
                      className={cn(
                        "shrink-0 px-6 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-widest transition-all border",
                        activeCategory === g.label 
                          ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20" 
                          : "bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--text-primary)]"
                      )}
                    >
                      {g.label}
                    </a>
                 ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-4 md:px-8 py-12">
        <AnimatePresence mode="popLayout">
          {groups.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-32 rounded-[var(--radius-2xl)] border-2 border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)]/30"
            >
              <ShoppingBag size={64} className="mx-auto text-[var(--border-strong)] mb-6" />
              <h3 className="text-2xl font-black mb-3 uppercase tracking-tight">Produto não encontrado</h3>
              <p className="text-[var(--text-secondary)] font-bold text-sm max-w-sm mx-auto mb-10">Não encontramos correspondências para "{q}" neste mercado.</p>
              <button onClick={() => setQ("")} className="pc-button-primary px-10 h-14">
                Ver catálogo completo
              </button>
            </motion.div>
          ) : groups.map((group, gIdx) => (
             <motion.section 
               key={group.label} 
               id={`cat-${group.label.replace(/\s+/g, '-')}`} 
               className="mb-20 scroll-mt-40"
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-100px" }}
               transition={{ duration: 0.5, delay: gIdx * 0.1 }}
             >
                <div className="flex items-center justify-between mb-10 border-b border-[var(--border-subtle)] pb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-2xl flex items-center justify-center border border-[var(--brand-primary)]/20">
                      <Tag size={24} />
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">
                      {group.label} 
                      <span className="text-base text-[var(--text-tertiary)] font-bold ml-4 lowercase">({group.items.length} itens)</span>
                    </h2>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                  {(q ? group.items : group.items.slice(0, 18)).map((p) => (
                    <ProductCardItem key={p.slug} p={p} storeId={id} allItems={group.items} />
                  ))}
                </div>
             </motion.section>
          ))}
        </AnimatePresence>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function ProductCardItem({ p, storeId, allItems }: { p: PublicStoreProduct; storeId: string; allItems: PublicStoreProduct[] }) {
  const isLowest = useMemo(() => {
    if (allItems.length <= 1) return false;
    const min = Math.min(...allItems.map(i => i.price));
    return p.price === min;
  }, [p.price, allItems]);

  return (
    <article
      className={cn(
        "group relative flex flex-col h-full rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--brand-primary)]/40 hover:shadow-2xl transition-all duration-300",
        isLowest && "shadow-xl shadow-[var(--success)]/5"
      )}
    >
      <div className="relative aspect-square p-6 flex items-center justify-center overflow-hidden">
        <ProductImage
          name={p.productName}
          alt={p.productName}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
        />
        {isLowest && (
          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-1.5">
            <span className="bg-[var(--success)] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-lg shadow-[var(--success)]/30 border border-white/10">
              Melhor Preço
            </span>
            {p.savingsPercent > 0 && (
              <span className="bg-[var(--brand-primary)] text-[var(--bg-base)] text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg shadow-md animate-pulse">
                -{Math.round(p.savingsPercent)}% OFF
              </span>
            )}
          </div>
        )}


      </div>
      
      <div className="p-5 flex flex-col flex-1 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <h4 className="font-black text-[15px] leading-tight line-clamp-2 uppercase tracking-tight group-hover:text-[var(--brand-primary)] transition-colors mb-4 min-h-[2.5rem]">
          {p.productName}
        </h4>

        
        <div className="mt-auto pt-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <Price value={p.price} size="lg" className="text-xl font-black tracking-tighter" />
            <button className="h-10 w-10 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-tertiary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all shadow-sm">
              <PlusCircleIcon size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mt-2">
            <Clock size={12} />
            <span>Atualizado {formatDate(p.lastDate)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function PlusCircleIcon({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}
