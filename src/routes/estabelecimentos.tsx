import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import {
  Search,
  MapPin,
  Store,
  ArrowRight,
  Clock,
  Filter,
  TrendingDown,
  ShoppingBasket,
  Pill,
  Croissant,
  Beef,
  Package,
  PiggyBank
} from "lucide-react";

import { listPublicEstablishments } from "@/lib/establishments-public.functions";
import { normalizeSearchText } from "@/lib/text-normalize";
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/ds/MarketCard";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  kind: fallback(z.string(), "__all").default("__all"),
  sort: fallback(z.string(), "relevance").default("relevance"),
});

export const Route = createFileRoute("/estabelecimentos")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Mercados Parceiros em Feijó — PreçoCerto" },
      { name: "description", content: "Compare preços e encontre os estabelecimentos disponíveis na sua cidade." },
    ],
  }),
  component: EstablishmentsPage,
});

const KIND_META: Record<string, { label: string; icon: any }> = {
  mercado: { label: "Supermercados", icon: ShoppingBasket },
  farmacia: { label: "Farmácias", icon: Pill },
  padaria: { label: "Padarias", icon: Croissant },
  acougue: { label: "Açougues", icon: Beef },
};

function EstablishmentsPage() {
  const fetchList = useServerFn(listPublicEstablishments);
  const { data, isLoading } = useQuery({
    queryKey: ["public-establishments"],
    queryFn: () => fetchList({}),
    staleTime: 60_000,
  });

  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [qDraft, setQDraft] = useState(search.q);

  useEffect(() => {
    const t = setTimeout(() => navigate({ search: (prev: any) => ({ ...prev, q: qDraft }), replace: true }), 300);
    return () => clearTimeout(t);
  }, [qDraft, navigate]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = normalizeSearchText(search.q);
    let list = data.items.slice();
    if (search.kind !== "__all") list = list.filter((e) => (e.kind ?? "outro") === search.kind);
    if (term) {
      list = list.filter(e => normalizeSearchText(e.name).includes(term) || normalizeSearchText(e.neighborhood || "").includes(term));
    }
    list.sort((a, b) => {
      if (search.sort === "name") return a.name.localeCompare(b.name);
      if (search.sort === "items") return b.productsCount - a.productsCount;
      if (search.sort === "savings") return b.maxSavings - a.maxSavings;
      return 0;
    });
    return list;
  }, [data, search.kind, search.q, search.sort]);

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <SiteHeader variant="solid" />

      <main className="mx-auto max-w-[1280px] px-4 py-12 md:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#94A3B8] mb-6">
          <Link to="/" className="hover:text-[#2563EB]">Início</Link>
          <ChevronRight size={12} />
          <span className="text-[#64748B]">Mercados</span>
        </nav>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-black text-[#0F172A] tracking-tight mb-3">Estabelecimentos em Feijó</h1>
            <p className="text-lg text-[#64748B] font-medium">Compare produtos e preços dos comércios cadastrados.</p>
          </div>
          
          <Button asChild variant="outline" className="rounded-full border-[#E5EAF1] bg-white text-[#64748B] h-12 px-6 shadow-sm hover:text-[#2563EB] font-bold">
            <Link to="/farmacias">
              <Pill className="w-4 h-4 mr-2" />
              Plantão de farmácias
            </Link>
          </Button>
        </div>

        {/* Metrics Bar */}
        {data && (
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-[#E5EAF1] mb-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <MetricItem label="Estabelecimentos" value={data.totalEstablishments} icon={Store} />
              <MetricItem label="Mercados" value={data.items.filter(i => i.kind === 'mercado').length} icon={ShoppingBasket} />
              <MetricItem label="Farmácias" value={data.items.filter(i => i.kind === 'farmacia').length} icon={Pill} />
              <MetricItem label="Açougues" value={data.items.filter(i => i.kind === 'acougue').length} icon={Beef} />
            </div>
          </div>
        )}

        {data?.items?.[0] && (
          <div className="mb-12 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
            <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Última verificação global realizada hoje</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white rounded-[24px] p-4 shadow-sm border border-[#E5EAF1] mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input 
              value={qDraft}
              onChange={e => setQDraft(e.target.value)}
              placeholder="Buscar mercado ou bairro..." 
              className="w-full h-12 bg-[#F8FAFC] rounded-2xl border-none pl-12 pr-4 text-[15px] font-bold outline-none ring-1 ring-[#E5EAF1] focus:ring-2 focus:ring-[#2563EB]/20 transition-all" 
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <FilterButton active={search.kind === "__all"} onClick={() => navigate({ search: (p: any) => ({ ...p, kind: "__all" }) })}>Todos</FilterButton>
            {Object.entries(KIND_META).map(([k, m]) => (
              <FilterButton 
                key={k} 
                active={search.kind === k} 
                onClick={() => navigate({ search: (p: any) => ({ ...p, kind: k }) })}
                icon={m.icon}
              >
                {m.label}
              </FilterButton>
            ))}
            
            <div className="h-8 w-[1px] bg-[#E5EAF1] mx-2 hidden md:block" />
            
            <select 
              value={search.sort}
              onChange={e => navigate({ search: (p: any) => ({ ...p, sort: e.target.value }) })}
              className="h-10 bg-[#F8FAFC] border border-[#E5EAF1] text-[#64748B] text-[13px] font-bold rounded-full px-4 outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            >
              <option value="relevance">Mais relevantes</option>
              <option value="name">Nome (A-Z)</option>
              <option value="items">Mais produtos</option>
              <option value="savings">Melhor economia</option>
            </select>
          </div>
        </div>

        {/* List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-white rounded-[32px] border border-[#E5EAF1] animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-24 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white border border-[#E5EAF1] text-[#94A3B8] mb-6">
                <Store size={40} />
              </div>
              <h3 className="text-xl font-bold text-[#0F172A] mb-2">Nenhum mercado encontrado</h3>
              <p className="text-[#64748B]">Tente ajustar sua busca ou filtros.</p>
            </div>
          ) : (
            filtered.map((e) => (
              <MarketCard 
                key={e.id}
                id={e.id}
                name={e.name}
                neighborhood={e.neighborhood || "Centro"}
                productsCount={e.productsCount}
                logoUrl={e.logoUrl}
                maxSavings={e.maxSavings}
                kind={e.kind}
              />
            ))
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function MetricItem({ label, value, icon: Icon, className }: { label: string; value: string | number; icon: any; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="h-12 w-12 rounded-2xl bg-[#F8FAFC] border border-[#E5EAF1] flex items-center justify-center text-[#2563EB] shadow-sm">
        <Icon size={24} />
      </div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8] mb-0.5">{label}</div>
        <div className="text-2xl font-black text-[#0F172A] leading-none">{value}</div>
      </div>
    </div>
  );
}

function FilterButton({ children, active, onClick, icon: Icon }: { children: React.ReactNode; active: boolean; onClick: () => void; icon?: any }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "h-10 px-4 rounded-full text-[13px] font-bold transition-all flex items-center gap-2 border",
        active 
          ? "bg-[#2563EB] border-[#2563EB] text-white shadow-md shadow-[#2563EB]/20" 
          : "bg-[#F8FAFC] border-[#E5EAF1] text-[#64748B] hover:border-[#2563EB]/40 hover:text-[#2563EB]"
      )}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function ChevronRight({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
