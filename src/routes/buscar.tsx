import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SearchHeroSection } from "@/components/search/SearchHeroSection";
import { SearchDashboard } from "@/components/search/SearchDashboard";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { SearchFiltersPanel } from "@/components/search/SearchFiltersPanel";
import { usePriceSearch } from "@/lib/use-price-search";
import { useState, useRef } from "react";
import { Search, Info } from "lucide-react";
import { Footer } from "@/components/brand/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";




const searchSchema = z.object({
  q: z.string().optional().default(""),
  c: z.string().optional().default(""),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  head: (ctx) => {
    const q = (ctx as any).search?.q || "";
    return {
      meta: [
        { title: `Resultados para "${q}" — PreçoCerto` },
        { name: "description", content: `Encontre o menor preço de ${q} nos mercados de Feijó.` },
      ],
    };
  },
  component: SearchResultsPage,
});


function SearchResultsPage() {
  const { q, c } = Route.useSearch();
  const navigate = useNavigate();
  const anchorRef = useRef<HTMLDivElement>(null);

  // Local state for persistence in the UI if needed
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  // `keepPreviousData` mantém o resultado anterior visível enquanto a próxima
  // busca carrega — nada é desmontado, então a página não sobe nem desce.
  const { data: result, isPending } = usePriceSearch(q, c);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand-primary)]/30">
      <SiteHeader variant="solid" />

      <main className="mx-auto w-full max-w-[1600px] flex flex-col md:flex-row min-h-[calc(100vh-80px)]">
        {/* Sidebar oculta em mobile conforme solicitação */}
        <aside className="hidden md:flex w-[400px] bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex-col shrink-0">
          <div className="p-8 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-0 z-20">
            <div className="flex flex-col mb-6">
              <h2 className="text-[12px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">Filtros Avançados</h2>
              <p className="text-[18px] font-black tracking-tight mt-1">Refinar Busca</p>
            </div>
            <SearchFiltersPanel isOpen={true} onToggle={() => {}} />
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
            <SearchSidebar 
              recent={recentQueries} 
              onPickQuery={(query) => {
                navigate({
                  to: "/buscar",
                  search: { q: query },
                  replace: true,
                  resetScroll: false,
                });
              }}
            />
          </div>
        </aside>

        {/* Main Content: Resultados */}
        <main className="flex-1 bg-[var(--bg-base)] overflow-y-auto p-4 md:p-12 space-y-12 no-scrollbar">
          <div ref={anchorRef} className="[overflow-anchor:none]">
            {isPending && !result ? (
              <div className="space-y-12" aria-busy="true">
                <div className="h-64 w-full rounded-[40px] bg-[var(--bg-surface-elevated)] animate-pulse border border-[var(--border-subtle)]" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 bg-[var(--bg-surface-elevated)] animate-pulse rounded-[32px] border border-[var(--border-subtle)]" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                {/* Hero e Dashboard */}
                {(q || c) && result && result.groups.length > 0 && (
                  <div className="space-y-8">
                    <SearchHeroSection query={q || c || ""} isCategory={!!c} />
                    <SearchDashboard />
                  </div>
                )}

                {/* Lista de Resultados */}
                {!q && !c ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center px-6">
                    <div className="h-24 w-24 bg-[var(--bg-surface-elevated)] rounded-[32px] flex items-center justify-center mb-8 border border-[var(--border-subtle)] shadow-inner">
                      <Search size={40} className="text-[var(--text-tertiary)]" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 uppercase tracking-tight">O que você procura hoje?</h2>
                    <p className="text-[var(--text-secondary)] font-bold text-lg max-w-lg">
                      Compare preços em tempo real nos maiores mercados de Feijó e economize agora.
                    </p>
                  </div>
                ) : result && result.groups.length > 0 ? (
                  <div className="space-y-10">
                    <SearchResultsList />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center px-6">
                    <div className="h-24 w-24 bg-[var(--bg-surface-elevated)] rounded-[32px] flex items-center justify-center mb-8 border border-[var(--border-subtle)] text-[var(--danger)] shadow-inner">
                      <Info size={40} />
                    </div>
                    <h2 className="text-3xl font-black mb-4 uppercase tracking-tight">Sem resultados</h2>
                    <p className="text-[var(--text-secondary)] font-bold text-lg max-w-lg">
                      Não encontramos "{q || c}" no momento. Tente outros termos ou navegue pelas categorias.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </main>

      <Footer />
      <MobileBottomNav />
    </div>

  );
}



