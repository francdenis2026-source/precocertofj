import { createFileRoute, useNavigate, useLoaderData } from "@tanstack/react-router";
import { Suspense, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, ChevronRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat } from "@/lib/products-public.functions";
import { listTrendingSearches } from "@/lib/search-trends.functions";
import { useSearchTrendsRealtime } from "@/hooks/useSearchTrendsRealtime";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { RecentProductsCarousel } from "@/components/home/RecentProductsCarousel";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [statsResult, economyResult] = await Promise.allSettled([
      getPlatformStats({} as any),
      getEconomyStat({} as any),
    ]);
    return {
      stats: statsResult.status === "fulfilled" ? statsResult.value : undefined,
      economy: economyResult.status === "fulfilled" ? economyResult.value : undefined,
    };
  },
  head: () => ({
    meta: [{ title: "PreçoCerto — Inteligência Real para Economizar" }],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const { user, loading: sessionLoading } = useSession();
  const [q, setQ] = useState("");
  const loaderData = useLoaderData({ from: "/" }) as { stats: any; economy: any; };
  
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({ to: "/buscar", search: { q: q.trim() } as any });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-white">
      <SiteHeader variant="overlay" showThemeToggle />
      
      <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="flex flex-col items-center text-center mb-20">
          <h1 className="font-['Space_Grotesk'] text-[56px] font-bold tracking-[-0.02em] leading-[1.1] mb-6">
            Inteligência real para <br />
            <span className="text-[var(--brand-primary)]">economizar</span>
          </h1>
          <form onSubmit={submitSearch} className="relative w-full max-w-xl flex items-center h-[56px] rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 shadow-2xl">
            <Search className="ml-3 h-5 w-5 text-[var(--text-tertiary)]" />
            <input 
              value={q} 
              onChange={(e) => setQ(e.target.value)}
              placeholder="O que você está procurando?" 
              className="flex-1 bg-transparent px-4 text-base outline-none placeholder:text-[var(--text-tertiary)]" 
            />
            <Button className="rounded-full px-8 bg-[var(--brand-primary)] h-11 font-bold">Buscar</Button>
          </form>
        </section>

        {/* Carousel */}
        <section className="mb-20">
          <h2 className="section-title">Últimas Coletas</h2>
          <Suspense fallback={<div className="h-64 animate-pulse bg-[var(--bg-surface)] rounded-[16px]" />}>
            <RecentProductsCarousel />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
