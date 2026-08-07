import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Beef,
  ChevronRight,
  Croissant,
  ExternalLink,
  MapPin,
  Package,
  PiggyBank,
  Pill,
  Search,
  ShoppingBasket,
  Store,
  X,
  Star,
} from "lucide-react";

import { slugifyEstablishment } from "@/lib/establishment-slug.functions";
import {
  humanizeCategory,
  listPublicEstablishments,
  type EstablishmentStat,
  type EstablishmentsOverview,
} from "@/lib/establishments-public.functions";

import { IsolatedPage } from "@/components/layout/IsolatedPage";
import { BackButton } from "@/components/layout/BackButton";
import { HomeBrandLink } from "@/components/layout/HomeBrandLink";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { FavoriteMarketButton } from "@/components/market/FavoriteMarketButton";
import { useSession } from "@/hooks/useSession";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { normalizeSearchText } from "@/lib/text-normalize";
import { tc } from "@/lib/typeclear";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  kind: fallback(z.string(), "__all").default("__all"),
  sort: fallback(z.string(), "relevance").default("relevance"),
  bairro: fallback(z.string(), "__all").default("__all"),
  economia: fallback(z.string(), "__all").default("__all"),
  sel: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/estabelecimentos")({
  validateSearch: zodValidator(searchSchema),
  component: EstablishmentsPage,
});

const KIND_META: Record<
  string,
  { label: string; icon: typeof Store; color: string }
> = {
  mercado: { label: "Supermercado", icon: ShoppingBasket, color: "bg-blue-50 text-blue-600 border-blue-100" },
  farmacia: { label: "Farmácia", icon: Pill, color: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  padaria: { label: "Padaria", icon: Croissant, color: "bg-amber-50 text-amber-600 border-amber-100" },
  acougue: { label: "Açougue", icon: Beef, color: "bg-orange-50 text-orange-600 border-orange-100" },
  outro: { label: "Outro", icon: Store, color: "bg-gray-50 text-gray-600 border-gray-100" },
};

function kindMeta(kind: string | null) {
  return KIND_META[kind ?? "outro"] ?? KIND_META.outro;
}

function EstablishmentsPage() {
  const fetchList = useServerFn(listPublicEstablishments);
  const { data, isLoading } = useQuery({
    queryKey: ["public-establishments"],
    queryFn: () => fetchList({}),
    staleTime: 60_000,
  });

  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const updateSearch = useCallback(
    (patch: Partial<z.infer<typeof searchSchema>>) => {
      navigate({
        search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, ...patch }),
        replace: true,
      });
    },
    [navigate],
  );

  const [qDraft, setQDraft] = useState(search.q);
  useEffect(() => {
    const t = setTimeout(() => updateSearch({ q: qDraft }), 300);
    return () => clearTimeout(t);
  }, [qDraft, updateSearch]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const term = normalizeSearchText(search.q);
    let list = data.items.slice();
    if (search.kind !== "__all") list = list.filter((e) => (e.kind ?? "outro") === search.kind);
    if (term) {
      list = list.filter(e => normalizeSearchText(e.name).includes(term) || normalizeSearchText(e.neighborhood || "").includes(term));
    }
    return list;
  }, [data, search.kind, search.q]);

  const selected = useMemo(() => {
    return filtered.find(e => e.id === search.sel) || filtered[0] || null;
  }, [filtered, search.sel]);

  useEffect(() => {
    if (filtered.length > 0 && !search.sel) {
        updateSearch({ sel: filtered[0].id });
    }
  }, [filtered, search.sel, updateSearch]);

  return (
    <IsolatedPage className="bg-[#FAFAFA]" contentClassName="!pb-0 font-body">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallbackTo="/" variant="ghost" className="text-gray-400 hover:text-gray-900" />
            <HomeBrandLink />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-[#1A1A2E] leading-tight">Comércios Parceiros</h1>
              <p className="text-[13px] text-[#6B7280]">Mercados de Feijó</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <Button asChild variant="outline" className="rounded-full border-gray-200 text-[#6B7280] font-semibold h-9 px-4 hidden md:flex">
                <Link to="/farmacias">
                    <Pill className="w-4 h-4 mr-2" />
                    Plantão Farmácias
                </Link>
             </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
                { label: "Comércios", value: data?.totalEstablishments || 0, icon: Store, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Produtos", value: data?.totalProducts.toLocaleString("pt-BR") || 0, icon: Package, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Economia", value: data?.totalMaxSavings ? `R$ ${data.totalMaxSavings.toFixed(2).replace(".", ",")}` : "R$ 0,00", icon: PiggyBank, color: "text-amber-600", bg: "bg-amber-50" },
            ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl shadow-sm flex items-center gap-5 border border-gray-50 transition-all hover:shadow-md">
                    <div className={cn("p-4 rounded-2xl", stat.bg, stat.color)}>
                        <stat.icon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-[11px] text-[#6B7280] font-bold uppercase tracking-wider">{stat.label}</div>
                        <div className="text-2xl font-black text-[#1A1A2E]">{stat.value}</div>
                    </div>
                </div>
            ))}
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Left Column: List */}
            <div className="w-full md:w-[380px] space-y-6 shrink-0">
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                            value={qDraft}
                            onChange={e => setQDraft(e.target.value)}
                            placeholder="Buscar mercado ou bairro..." 
                            className="h-12 bg-white rounded-2xl shadow-sm border-gray-100 pl-11 focus:ring-amber-400 focus:border-amber-400" 
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {["__all", "mercado", "farmacia", "acougue"].map((k) => {
                            const meta = k === "__all" ? { label: "Todos", icon: Store } : KIND_META[k];
                            const active = search.kind === k;
                            return (
                                <button 
                                    key={k} 
                                    onClick={() => updateSearch({ kind: k })}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border",
                                        active 
                                            ? "bg-amber-100 border-amber-200 text-amber-700 shadow-sm" 
                                            : "bg-white border-gray-100 text-[#6B7280] hover:border-amber-200"
                                    )}
                                >
                                    <meta.icon className="w-3.5 h-3.5" />
                                    {meta.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                        ))
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center text-[#6B7280] bg-white rounded-3xl border border-dashed">Nenhum mercado encontrado</div>
                    ) : filtered.map((e) => {
                        const meta = kindMeta(e.kind);
                        const active = search.sel === e.id;
                        return (
                            <button 
                                key={e.id} 
                                onClick={() => updateSearch({ sel: e.id })} 
                                className={cn(
                                    "group w-full text-left p-4 bg-white rounded-2xl shadow-sm border transition-all duration-300",
                                    active 
                                        ? "border-amber-400 ring-4 ring-amber-400/5 shadow-md" 
                                        : "border-gray-50 hover:border-amber-200 hover:shadow-md"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <StoreLogoThumb src={e.logoUrl} name={e.name} className="h-14 w-14 rounded-xl shadow-inner bg-gray-50" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-[#1A1A2E] group-hover:text-amber-600 transition-colors">{e.name}</div>
                                        <div className="text-[12px] text-[#6B7280] font-medium flex items-center gap-1.5 mt-0.5">
                                            <span className={cn("px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase", meta.color)}>{meta.label}</span>
                                            <span className="opacity-40">·</span>
                                            <span className="truncate">{e.neighborhood || "Feijó"}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-amber-500">{e.productsCount}</div>
                                        <div className="text-[10px] text-[#6B7280] font-bold uppercase">Itens</div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right Column: Detail */}
            <div className="flex-1 w-full bg-white rounded-[32px] p-6 md:p-10 border border-gray-50 shadow-sm sticky top-28">
                {selected ? (
                     <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Detail Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <StoreLogoThumb src={selected.logoUrl} name={selected.name} className="w-24 h-24 rounded-[28px] shadow-lg bg-gray-50 border-4 border-white" />
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn("px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase", kindMeta(selected.kind).color)}>{kindMeta(selected.kind).label}</span>
                                        <FavoriteMarketButton marketName={selected.name} />
                                    </div>
                                    <h2 className="text-3xl font-black text-[#1A1A2E] leading-tight">{selected.name}</h2>
                                    <div className="flex items-center gap-2 text-sm text-[#6B7280] mt-1 font-medium">
                                        <MapPin className="w-4 h-4 text-amber-500" />
                                        {selected.neighborhood ? `${selected.neighborhood}, ` : ""}Feijó/AC
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detail Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                             {[
                                { label: "Produtos monitorados", value: selected.productsCount, icon: Package, color: "bg-blue-50 text-blue-600" },
                                { label: "Potencial de economia", value: `R$ ${selected.maxSavings.toFixed(2).replace(".", ",")}`, icon: PiggyBank, color: "bg-emerald-50 text-emerald-600" },
                                { label: "Categorias", value: selected.topCategories.length, icon: Store, color: "bg-purple-50 text-purple-600" }
                            ].map((s, i) => (
                                <div key={i} className="p-5 rounded-2xl bg-[#F8FAFC] border border-gray-100 transition-transform hover:scale-[1.02]">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", s.color)}>
                                        <s.icon className="w-5 h-5" />
                                    </div>
                                    <div className="text-[11px] text-[#6B7280] font-bold uppercase tracking-wider mb-1">{s.label}</div>
                                    <div className="text-xl font-black text-[#1A1A2E]">{s.value}</div>
                                </div>
                            ))}
                        </div>

                        {/* Category Progress Bars */}
                        <div className="space-y-6">
                             <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Departamentos em Destaque</h3>
                                <div className="text-[11px] font-bold text-gray-400">POR VOLUME DE ITENS</div>
                             </div>
                             <div className="grid gap-5">
                                {selected.topCategories.slice(0, 5).map((c, i) => {
                                    const pct = Math.round((c.count / selected.productsCount) * 100);
                                    return (
                                        <div key={i} className="space-y-2">
                                            <div className="flex justify-between text-sm font-bold text-[#1A1A2E]">
                                                <span>{humanizeCategory(c.category)}</span>
                                                <span className="text-gray-400">{c.count} itens</span>
                                            </div>
                                            <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden border border-gray-100">
                                                <div 
                                                    className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full shadow-[0_0_8px_rgba(251,191,36,0.3)] transition-all duration-1000" 
                                                    style={{ width: `${pct}%` }} 
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-4 pt-4">
                            <Button asChild size="lg" className="rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#1A1A2E] font-black h-14 px-8 shadow-lg shadow-amber-400/20 transition-all hover:-translate-y-1">
                                <Link to="/estabelecimento/$slug" params={{ slug: slugifyEstablishment(selected.name) }}>
                                    Explorar Catálogo Completo
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg" className="rounded-2xl border-gray-200 text-[#1A1A2E] font-bold h-14 px-8 hover:bg-gray-50">
                                <Link to="/buscar" search={{ estabelecimento: selected.name } as any}>
                                    <Search className="w-5 h-5 mr-2" />
                                    Pesquisar Itens
                                </Link>
                            </Button>
                        </div>
                     </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                        <Store className="w-16 h-16 text-gray-100" />
                        <div className="text-gray-400 font-medium">Selecione um comércio ao lado para<br/>ver estatísticas e economia.</div>
                    </div>
                )}
            </div>
        </div>
      </section>
    </IsolatedPage>
  );
}
