import { createFileRoute, useNavigate, retainSearchParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { PriceSearchBar } from "@/components/scanner/PriceSearchBar";
import { SearchHeroSection } from "@/components/search/SearchHeroSection";
import { SearchDashboard } from "@/components/search/SearchDashboard";
import { SearchFiltersPanel } from "@/components/search/SearchFiltersPanel";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { IsolatedPage } from "@/components/layout/IsolatedPage";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  categoria: fallback(z.string(), "").default(""),
  mode: fallback(z.string(), "strict").default("strict"),
  pure: fallback(z.string(), "1").default("1"),
  brand: fallback(z.string(), "").default(""),
  min: fallback(z.string(), "").default(""),
  max: fallback(z.string(), "").default(""),
  sort: fallback(z.string(), "cheapest").default("cheapest"),
  product: fallback(z.string(), "").default(""),
  market: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/buscar")({
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [
      retainSearchParams([
        "q",
        "categoria",
        "mode",
        "pure",
        "brand",
        "min",
        "max",
        "sort",
        "product",
        "market",
      ]),
    ],
  },
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <IsolatedPage fit={!search.q} className="pc-search-scope">
      <div className="flex min-h-svh flex-col bg-background">
        {/* Sticky Search Header */}
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl">
           <div className="mx-auto max-w-7xl px-4 py-3">
             <PriceSearchBar initialQuery={search.q} />
           </div>
        </header>

        {search.q ? (
          <main className="mx-auto w-full max-w-7xl px-4 py-6 space-y-8">
            <SearchHeroSection query={search.q} />
            <SearchDashboard />
            <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-8">
              <SearchFiltersPanel isOpen={filtersOpen} onToggle={() => setFiltersOpen(!filtersOpen)} />
              <SearchResultsList />
            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center">
             {/* Home discovery state */}
             <p className="text-muted-foreground">Comece buscando um produto...</p>
          </div>
        )}
      </div>
    </IsolatedPage>
  );
}
