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
  Sparkles
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
  const [isExporting, setIsExporting] = useState(false);

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

  return (
    <div className="min-h-[100svh] bg-[#0F1420] text-foreground pb-20">
      <div className="mx-auto max-w-5xl px-4 pt-6">
        {/* Header - simplified from original as requested */}
        <header className="relative mb-8 rounded-3xl border border-white/5 bg-[#0F1A30] p-6 shadow-2xl">
          <div className="flex items-start gap-4">
             {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-16 w-16 rounded-2xl border border-white/10 bg-white" />
             ) : (
                <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><StoreIcon /></div>
             )}
             <div className="flex-1">
               <h1 className="text-xl font-bold text-white">{store.name}</h1>
               <p className="text-[12px] text-white/50">{store.neighborhood} · {store.city}</p>
               <div className="flex gap-4 mt-2">
                 <div className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">{products.length} Produtos</div>
                 <div className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">{categories.length} Categorias</div>
               </div>
             </div>
          </div>
        </header>

        {/* Sticky Nav */}
        <nav className="sticky top-0 z-40 bg-[#0F1420]/95 backdrop-blur py-3 mb-6 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
             {groups.map((g) => (
                <a key={g.label} href={`#cat-${g.label.replace(/\s+/g, '-')}`} className="shrink-0 px-4 py-1.5 rounded-full bg-[#1A2640] text-[11px] font-bold text-white uppercase tracking-wider border border-white/5 hover:bg-primary hover:text-primary-foreground transition-all">
                  {g.label} ({g.items.length})
                </a>
             ))}
          </div>
        </nav>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
          <input 
            value={q} 
            onChange={e => setQ(e.target.value)}
            className="w-full bg-[#1A2640] rounded-full py-3.5 pl-12 pr-6 text-white placeholder:text-white/20 border border-white/5 focus:outline-none focus:border-primary/50 transition-all"
            placeholder="Buscar produtos em todo o catálogo..."
          />
        </div>

        {/* Categories Grid */}
        <div className="space-y-12">
          {groups.map((group) => (
             <section key={group.label} id={`cat-${group.label.replace(/\s+/g, '-')}`} className="scroll-mt-24">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 border-b border-white/5 pb-2">
                  {group.label} <span className="text-sm text-white/40 font-normal">({group.items.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.items.slice(0, 6).map((p) => (
                    <ProductCard key={p.slug} p={p} storeId={id} />
                  ))}
                </div>
                {group.items.length > 6 && (
                   <button className="mt-4 w-full py-3 rounded-xl border border-white/5 text-[12px] font-bold uppercase tracking-widest text-primary hover:bg-white/5 transition-all">
                     Ver todos os {group.items.length} produtos de {group.label} →
                   </button>
                )}
             </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ p, storeId }: { p: PublicStoreProduct; storeId: string }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#1A2640] p-4 flex gap-4 hover:border-primary/30 transition-all shadow-lg group">
      <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden flex items-center justify-center shrink-0">
         {p.imageUrl ? <img src={p.imageUrl} alt={p.productName} className="object-cover w-full h-full" /> : <Sparkles className="text-white/10" />}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[14px] text-white leading-tight line-clamp-2 group-hover:text-primary transition-colors">{p.productName}</h3>
        <p className="text-[11px] text-white/40 mt-0.5">{p.category} · {p.pricePerUnit ? `${p.pricePerUnit.toFixed(2)}/un` : '—'}</p>
        <div className="mt-2 flex items-end justify-between">
           <p className="text-[18px] font-bold text-primary">R$ {p.price.toFixed(2).replace('.', ',')}</p>
           <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">
             {new Date(p.lastDate).toLocaleDateString('pt-BR')}
           </span>
        </div>
      </div>
    </div>
  );
}
