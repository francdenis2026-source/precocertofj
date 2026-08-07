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
  TrendingDown,
  Star,
  Bell,
  Zap,
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
import { listFavoriteMarkets } from "@/lib/favorites.functions";
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
  mercado: { label: "Supermercado", icon: ShoppingBasket, color: "bg-blue-100 text-blue-700 border-blue-200" },
  farmacia: { label: "Farmácia", icon: Pill, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  padaria: { label: "Padaria", icon: Croissant, color: "bg-amber-100 text-amber-700 border-amber-200" },
  acougue: { label: "Açougue", icon: Beef, color: "bg-orange-100 text-orange-700 border-orange-200" },
  outro: { label: "Outro", icon: Store, color: "bg-gray-100 text-gray-700 border-gray-200" },
};

function kindMeta(kind: string | null) {
  return KIND_META[kind ?? "outro"] ?? KIND_META.outro;
}

function EstablishmentsPage() {
  const fetchList = useServerFn(listPublicEstablishments);
  const { data } = useQuery({
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

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.items.slice();
    if (search.kind !== "__all") list = list.filter((e) => (e.kind ?? "outro") === search.kind);
    return list;
  }, [data, search.kind]);

  return (
    <IsolatedPage className="bg-[#FAFAFA]" contentClassName="!pb-0">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <HomeBrandLink />
            <div>
              <h1 className="text-2xl font-black text-[#1A1A2E]">Comércios Parceiros</h1>
              <p className="text-sm text-[#6B7280]">Mercados de Feijó</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-full border-gray-300">Plantão Farmácias</Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
                { label: "Comércios", value: data?.totalEstablishments || 0, icon: Store },
                { label: "Produtos", value: data?.totalProducts || 0, icon: Package },
                { label: "Economia", value: `R$ ${(data?.totalMaxSavings || 0).toFixed(2)}`, icon: PiggyBank },
            ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm flex items-center gap-4 border border-gray-100">
                    <div className="bg-amber-100 p-3 rounded-full text-amber-600"><stat.icon className="w-6 h-6" /></div>
                    <div>
                        <div className="text-sm text-gray-500 font-semibold uppercase tracking-wider">{stat.label}</div>
                        <div className="text-2xl font-black text-[#1A1A2E]">{stat.value}</div>
                    </div>
                </div>
            ))}
        </div>

        <div className="flex gap-4">
            <div className="w-[380px] space-y-4">
                <Input placeholder="Buscar estabelecimentos..." className="h-12 bg-white rounded-xl shadow-sm border-gray-200" />
                <div className="flex flex-wrap gap-2">
                    {["Todos", "Supermercado", "Farmácia", "Açougue"].map((k) => (
                        <button key={k} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-semibold hover:border-amber-400">{k}</button>
                    ))}
                </div>

                <div className="space-y-3">
                    {filtered.map((e) => {
                        const meta = kindMeta(e.kind);
                        return (
                            <button key={e.id} onClick={() => updateSearch({ sel: e.id })} className={cn("w-full text-left p-4 bg-white rounded-xl shadow-sm border transition-all", search.sel === e.id ? "border-amber-400" : "border-gray-100")}>
                                <div className="flex items-center gap-3">
                                    <StoreLogoThumb src={e.logoUrl} name={e.name} className="h-12 w-12" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-[#1A1A2E]">{e.name}</div>
                                        <div className="text-xs text-gray-500">{meta.label} · {e.neighborhood}</div>
                                    </div>
                                    <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold">{e.productsCount} itens</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                {filtered.find(e => e.id === search.sel) ? (
                     <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <StoreLogoThumb src={filtered.find(e => e.id === search.sel)?.logoUrl} name="Logo" className="w-20 h-20" />
                            <div>
                                <h2 className="text-2xl font-black">{filtered.find(e => e.id === search.sel)?.name}</h2>
                                <p className="text-gray-500">{filtered.find(e => e.id === search.sel)?.neighborhood}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                             {[
                                { label: "Produtos", value: "3.059" },
                                { label: "Maior economia", value: "R$ 18,25" },
                                { label: "Categorias", value: "12" }
                            ].map((s, i) => (
                                <div key={i} className="p-4 border rounded-xl bg-gray-50">
                                    <div className="text-xs text-gray-500 uppercase">{s.label}</div>
                                    <div className="font-bold">{s.value}</div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2">
                             <div className="text-sm font-semibold uppercase text-gray-500">Categorias em destaque</div>
                             {[
                                { name: "Limpeza", count: 120, pct: 40 },
                                { name: "Alimentos", count: 80, pct: 25 },
                                { name: "Higiene", count: 40, pct: 15 }
                             ].map((c, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="text-sm flex-1">{c.name}</div>
                                    <div className="w-full max-w-[200px] bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-amber-400 h-full" style={{ width: `${c.pct}%` }} />
                                    </div>
                                    <div className="text-sm font-bold">{c.count}</div>
                                </div>
                             ))}
                        </div>
                     </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">Selecione um estabelecimento</div>
                )}
            </div>
        </div>
      </section>
    </IsolatedPage>
  );
}
