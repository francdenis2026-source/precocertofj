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
import { Skeleton } from "@/components/ui/skeleton";



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
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] [overflow-anchor:none]">
      <SiteHeader variant="solid" />

      
      <main className="mx-auto max-w-[1600px] px-4 py-20 md:px-8">
        <div ref={anchorRef} className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr,400px]">
          {/* Main Content Area */}
          <div className="space-y-16 min-h-[640px] [overflow-anchor:none]">
            {isPending && !result ? (
              <div className="space-y-8" aria-busy="true">
                <Skeleton className="h-[320px] w-full rounded-[40px]" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[400px] w-full rounded-3xl" />
                  ))}
                </div>
              </div>
            ) : (
            <>
              {/* Show Hero and Stats Dashboard only if there's a result and a query or category */}
              {(q || c) && result && result.groups.length > 0 && (
                <div className="space-y-6">
                  <SearchHeroSection query={q || c || ""} isCategory={!!c} />
                  <SearchDashboard />
                </div>
              )}

              {/* If no query or no results, show a centered search state or message */}
              {!q && !c ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                   <h2 className="text-2xl font-black text-foreground mb-2">O que você está procurando hoje?</h2>
                   <p className="text-muted-foreground max-w-md">Busque produtos específicos para encontrar o menor preço nos mercados de Feijó.</p>
                </div>
              ) : result && result.groups.length > 0 ? (
                <div className="space-y-8 pt-4">
                  <SearchResultsList />
                </div>
              ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <p className="text-lg font-bold text-foreground">Nenhum resultado encontrado para "{q || c}"</p>
                 <p className="text-muted-foreground">Tente um termo de busca diferente ou confira as sugestões ao lado.</p>
              </div>
            )}
            </>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="hidden lg:block space-y-10">
            <SearchFiltersPanel isOpen={true} onToggle={() => {}} />
            <SearchSidebar 
              recent={recentQueries} 
              onPickQuery={(query) => {
                // Navegação client-side, sem recarregar a página e sem
                // empilhar histórico — a rota não remonta, então não há salto.
                navigate({
                  to: "/buscar",
                  search: { q: query },
                  replace: true,
                  resetScroll: false,
                });
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}



