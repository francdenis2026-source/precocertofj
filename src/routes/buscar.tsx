import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SearchHeroSection } from "@/components/search/SearchHeroSection";
import { SearchDashboard } from "@/components/search/SearchDashboard";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { SearchSidebar } from "@/components/search/SearchSidebar";
import { SearchFiltersPanel } from "@/components/search/SearchFiltersPanel";
import { searchProductPrice } from "@/lib/price-search.functions";
import { useState, useRef } from "react";
import { PageLoader } from "@/components/feedback";



const searchSchema = z.object({
  q: z.string().optional().default(""),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  head: (ctx) => {
    const q = (ctx as any).search?.q || "";
    return {
      meta: [
        { title: `Resultados para "${q}" — PreçoCerto` },
        { name: "description", content: `Encontre o menor preço para ${q} nos mercados de Feijó.` },
      ],
    };
  },
  component: SearchResultsPage,
});


function SearchResultsPage() {
  const { q } = Route.useSearch();
  const runSearch = useServerFn(searchProductPrice);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Local state for persistence in the UI if needed
  const [recentQueries, setRecentQueries] = useState<string[]>([]);

  const { data: result, isLoading } = useQuery({
    queryKey: ["price-search", q],
    queryFn: () => runSearch({ data: { query: q || "" } }),
    enabled: true, // Always enabled so we can show empty states
    staleTime: 30_000,
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#050B14]">
      <SiteHeader variant="solid" />
      
      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        <div ref={anchorRef} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,380px]">
          {/* Main Content Area */}
          <div className="space-y-12">
            {/* Show Hero only if there's a result and a query */}
            {q && result && result.groups.length > 0 && (
              <SearchHeroSection query={q} />
            )}

            {/* If no query or no results, show a centered search state or message */}
            {!q ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <h2 className="text-2xl font-black text-foreground mb-2">O que você procura hoje?</h2>
                 <p className="text-muted-foreground max-w-md">Busque por produtos específicos para encontrar o menor preço nos mercados de Feijó.</p>
              </div>
            ) : result && result.groups.length > 0 ? (
              <>
                <SearchDashboard />
                <SearchResultsList />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <p className="text-lg font-bold text-foreground">Nenhum resultado encontrado para "{q}"</p>
                 <p className="text-muted-foreground">Tente buscar por um termo diferente ou confira as sugestões ao lado.</p>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="hidden lg:block space-y-10">
            <SearchFiltersPanel isOpen={true} onToggle={() => {}} />
            <SearchSidebar 
              recent={recentQueries} 
              onPickQuery={(query) => {
                // Navigate to same page with new query
                window.location.search = `?q=${encodeURIComponent(query)}`;
              }} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}



