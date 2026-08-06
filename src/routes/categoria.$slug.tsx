import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Filter, 
  ChevronDown, 
  Store, 
  MapPin, 
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/ds/Price";
import { cn } from "@/lib/utils";
import { getRecentProducts } from "@/lib/products-public.functions";

export const Route = createFileRoute("/categoria/$slug")({
  loader: async ({ params }) => {
    // In a real app, we'd fetch products by category
    // For now, we'll use recent products and filter them mock-style
    const products = await getRecentProducts({ data: { limit: 50 } });
    return {
      slug: params.slug,
      products: products || []
    };
  },
  head: ({ params }) => ({
    meta: [
      { title: `Categoria: ${params.slug} — PreçoCerto` },
      { name: "description", content: `Veja os melhores preços da categoria ${params.slug} em Feijó.` }
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug, products } = useLoaderData({ from: "/categoria/$slug" });
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeUnit, setActiveUnit] = useState<string | null>(null);
  const [activePriceRange, setActivePriceRange] = useState<[number, number] | null>(null);
  const [sortOrder, setSortOrder] = useState<"relevance" | "price_asc" | "price_desc">("relevance");

  const brands = useMemo(() => {
    const b = new Set<string>();
    products.forEach((p: any) => {
      const brand = p.name.split(" ")[0];
      b.add(brand);
    });
    return Array.from(b).slice(0, 8);
  }, [products]);

  const units = useMemo(() => {
    const u = new Set<string>();
    // Simular extração de unidades baseada em nomes de produtos se não houver campo explícito
    products.forEach((p: any) => {
      if (p.name.includes("1kg")) u.add("1kg");
      if (p.name.includes("500g")) u.add("500g");
      if (p.name.includes("1L")) u.add("1L");
      if (p.name.includes("2L")) u.add("2L");
    });
    return Array.from(u);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeBrand) {
      list = list.filter(p => p.name.startsWith(activeBrand));
    }
    if (activeUnit) {
      list = list.filter(p => p.name.toLowerCase().includes(activeUnit.toLowerCase()));
    }
    if (activePriceRange) {
      list = list.filter(p => p.price >= activePriceRange[0] && p.price <= activePriceRange[1]);
    }

    if (sortOrder === "price_asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortOrder === "price_desc") {
      list.sort((a, b) => b.price - a.price);
    }
    
    return list;
  }, [products, activeBrand, activeUnit, activePriceRange, sortOrder]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-24">
      <SiteHeader variant="solid" showThemeToggle />
      
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col gap-4 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-tertiary)] hover:text-[var(--brand-primary)] transition-colors">
            <ArrowLeft className="h-3 w-3" />
            Voltar ao Início
          </Link>
          <div className="flex items-end gap-3">
            <h1 className="text-3xl sm:text-4xl font-display font-bold capitalize text-white">
              {slug.replace("-", " ")}
            </h1>
            <span className="mb-1.5 text-xs font-black uppercase tracking-widest text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-2 py-0.5 rounded">
              {filteredProducts.length} itens
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-3 space-y-8">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="h-4 w-4 text-[var(--brand-primary)]" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">Filtros</h2>
              </div>

              {/* Brands */}
              <div className="space-y-4 mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Marcas</h3>
                <div className="flex flex-wrap gap-2">
                  {brands.map(brand => (
                    <button
                      key={brand}
                      onClick={() => setActiveBrand(activeBrand === brand ? null : brand)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border",
                        activeBrand === brand 
                          ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-black" 
                          : "bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10"
                      )}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Units */}
              {units.length > 0 && (
                <div className="space-y-4 mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Unidade</h3>
                  <div className="flex flex-wrap gap-2">
                    {units.map(unit => (
                      <button
                        key={unit}
                        onClick={() => setActiveUnit(activeUnit === unit ? null : unit)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all border",
                          activeUnit === unit 
                            ? "bg-[var(--brand-primary)] border-[var(--brand-primary)] text-black" 
                            : "bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10"
                        )}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price Range */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Faixa de Preço</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "Até R$ 10", range: [0, 10] },
                    { label: "R$ 10 - R$ 50", range: [10, 50] },
                    { label: "Acima de R$ 50", range: [50, 9999] }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePriceRange(activePriceRange?.[0] === item.range[0] ? null : item.range as any)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border flex items-center justify-between",
                        activePriceRange?.[0] === item.range[0]
                          ? "bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] text-[var(--brand-primary)]"
                          : "bg-white/5 border-white/10 text-[var(--text-secondary)] hover:bg-white/10"
                      )}
                    >
                      {item.label}
                      {activePriceRange?.[0] === item.range[0] && <CheckCircle2 className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--brand-primary)] rounded-2xl p-6 text-black shadow-lg shadow-[var(--brand-primary)]/20">
              <h3 className="text-xs font-black uppercase tracking-widest mb-2">Viu um preço?</h3>
              <p className="text-[11px] font-medium leading-relaxed mb-4 opacity-80">
                Ajude a comunidade registrando preços que você encontrar nas lojas.
              </p>
              <Button className="w-full bg-black text-white hover:bg-black/80 rounded-xl font-bold text-[10px] uppercase tracking-widest h-10">
                Registrar Preço
              </Button>
            </div>
          </aside>

          {/* Product List */}
          <div className="lg:col-span-9">
            {/* Sorting */}
            <div className="flex justify-end mb-6">
              <div className="flex bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)]">
                <button 
                  onClick={() => setSortOrder("relevance")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    sortOrder === "relevance" ? "bg-[var(--brand-primary)] text-black" : "text-[var(--text-tertiary)] hover:text-white"
                  )}
                >
                  Relevância
                </button>
                <button 
                  onClick={() => setSortOrder("price_asc")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    sortOrder === "price_asc" ? "bg-[var(--brand-primary)] text-black" : "text-[var(--text-tertiary)] hover:text-white"
                  )}
                >
                  Menor Preço
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div 
                  key={product.catalog_slug || product.id}
                  className="group relative bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden hover:border-[var(--brand-primary)] transition-all duration-300"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--brand-primary)]">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Price value={product.price} className="text-xl font-bold text-[var(--brand-primary)]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Por Unidade</span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-[var(--brand-primary)] transition-colors">
                      {product.name}
                    </h3>

                    <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                        <Store className="h-3 w-3" />
                        <span className="font-bold text-[var(--text-secondary)]">{product.cheapest_store}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                        <MapPin className="h-3 w-3" />
                        <span>Feijó, AC</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
                        <Clock className="h-3 w-3" />
                        <span>Atualizado {new Date(product.last_seen_at || "").toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 pt-0">
                    <Button 
                      onClick={() => window.dispatchEvent(new CustomEvent('open-quick-view', { detail: product }))}
                      className="w-full bg-white/5 hover:bg-[var(--brand-primary)] hover:text-black border border-white/10 hover:border-[var(--brand-primary)] rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all"
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <Filter className="h-8 w-8 text-[var(--text-tertiary)] opacity-20" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Nenhum produto encontrado</h3>
                <p className="text-sm text-[var(--text-tertiary)] max-w-xs">
                  Tente ajustar os filtros ou buscar por outro termo na categoria.
                </p>
                <Button 
                  onClick={() => { setActiveBrand(null); setActivePriceRange(null); }}
                  variant="link" 
                  className="mt-4 text-[var(--brand-primary)] font-bold text-xs uppercase tracking-widest"
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
