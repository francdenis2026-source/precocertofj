import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicStores, getPublicStoreCatalog } from "@/lib/stores-public.functions";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Search, Store, Clock, Package, ChevronRight, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Price } from "@/components/ds/Price";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/app")({
  loader: async () => {
    return {
      stores: await listPublicStores(),
    };
  },
  head: () => ({
    meta: [
      { title: "Status do Sistema | PreçoCerto" },
      { name: "description", content: "Status de atualização e catálogo de produtos por estabelecimento." }
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const { stores } = useLoaderData({ from: "/app" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const filteredStores = useMemo(() => {
    return stores.filter((s: any) => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stores, searchTerm]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <SiteHeader showThemeToggle />
      
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Status do Sistema</h1>
          <p className="text-[var(--text-tertiary)]">
            Acompanhe a cobertura de dados e atualizações em tempo real em Feijó.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar: Stores List */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
              <Input 
                placeholder="Buscar estabelecimento..." 
                className="pl-10 bg-[var(--bg-surface)] border-[var(--border-subtle)]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              {filteredStores.map((store: any) => (
                <button
                  key={store.id}
                  onClick={() => setSelectedStoreId(store.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedStoreId === store.id 
                      ? "bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] shadow-sm" 
                      : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/30"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm">{store.name}</h3>
                    <Badge variant="secondary" className="text-[10px] font-bold">
                      {store.productCount} itens
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)] font-medium uppercase tracking-wider">
                    <Clock className="h-3 w-3" />
                    <span>Feijó, {store.state}</span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Main Content: Store Details / Catalog */}
          <section className="lg:col-span-8">
            {selectedStoreId ? (
              <StoreCatalog storeId={selectedStoreId} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-subtle)] text-center px-6">
                <Store className="h-12 w-12 text-[var(--text-tertiary)] mb-4 opacity-20" />
                <h2 className="text-xl font-bold mb-2">Selecione um estabelecimento</h2>
                <p className="text-[var(--text-tertiary)] max-w-xs mx-auto text-sm">
                  Escolha um mercado na lista ao lado para ver o catálogo completo de produtos e status de atualização.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function StoreCatalog({ storeId }: { storeId: string }) {
  const getCatalog = useServerFn(getPublicStoreCatalog);
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["store-catalog", storeId],
    queryFn: () => getCatalog({ data: { id: storeId } }),
  });

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return data.products.filter(p => {
      const matchesSearch = p.productName.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = !activeCategory || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [data, productSearch, activeCategory]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Store Header Info */}
      <Card className="bg-[var(--bg-surface)] border-[var(--border-subtle)] overflow-hidden rounded-3xl">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{data.store.name}</h2>
                {data.store.id === 'f02c23db-3934-41f4-9e61-dc16c6c28115' && (
                  <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/20">Foco Contamigos</Badge>
                )}
              </div>
              <p className="text-sm text-[var(--text-tertiary)] flex items-center gap-2">
                <Store className="h-4 w-4" />
                {data.store.neighborhood ? `${data.store.neighborhood}, ` : ''}{data.store.city} - {data.store.state}
              </p>
            </div>
            <div className="bg-[var(--bg-base)]/50 p-4 rounded-2xl border border-[var(--border-subtle)] text-right min-w-[200px]">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Última Atualização</div>
              <div className="text-sm font-bold">
                {data.products[0] ? format(new Date(data.products[0].lastDate), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'Nenhuma'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catalog Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <Input 
            placeholder="Filtrar produtos no catálogo..." 
            className="pl-10 bg-[var(--bg-surface)] border-[var(--border-subtle)] h-12 rounded-xl"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <Button 
            variant={activeCategory === null ? "default" : "outline"} 
            size="sm"
            onClick={() => setActiveCategory(null)}
            className="rounded-full h-12 px-6 border-[var(--border-subtle)]"
          >
            Todos
          </Button>
          {data.categories.map(cat => (
            <Button 
              key={cat.key}
              variant={activeCategory === cat.label ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat.label)}
              className="rounded-full h-12 px-6 border-[var(--border-subtle)] whitespace-nowrap"
            >
              {cat.label} ({cat.count})
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <div 
              key={product.slug}
              className="group p-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--brand-primary)]/40 transition-all"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="text-[9px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-1">
                    {product.category}
                  </div>
                  <h4 className="font-bold text-sm mb-1 leading-snug group-hover:text-[var(--brand-primary)] transition-colors">
                    {product.productName}
                  </h4>
                  <div className="text-[10px] text-[var(--text-tertiary)] font-medium">
                    {format(new Date(product.lastDate), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
                <div className="text-right">
                  <Price value={product.price} className="text-base font-black" />
                  {product.unitLabel && (
                    <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase mt-0.5">
                      {product.unitLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)]">
            <Package className="h-8 w-8 text-[var(--text-tertiary)] mx-auto mb-2 opacity-20" />
            <p className="text-sm text-[var(--text-tertiary)]">Nenhum produto encontrado com estes filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}
