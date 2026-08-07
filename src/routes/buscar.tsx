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

  const { data: result, isLoading } = useQuery({
    queryKey: ["price-search", q],
    queryFn: () => runSearch({ data: { query: q || "" } }),
    enabled: true, // Always enabled so we can show empty states
  });


  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#050B14]">
      <SiteHeader variant="solid" />
      
      <main className="mx-auto max-w-[1600px] px-4 py-8 md:px-8">
        <div ref={anchorRef} className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr,380px]">
          {/* Main Content Area */}
          <div className="space-y-12">
            {q && <SearchHeroSection query={q} />}
            <SearchDashboard />
            <SearchResultsList />
          </div>

          {/* Sidebar Area */}
          <div className="hidden lg:block space-y-10">
            <SearchFiltersPanel isOpen={true} onToggle={() => {}} />
            <SearchSidebar recent={[]} onPickQuery={() => {}} />
          </div>
        </div>
      </main>
    </div>
  );
}



