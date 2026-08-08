import { createFileRoute, useLoaderData, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  PlusCircle,
  ShieldCheck,
  LineChart,
  Zap,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat, getRecentProducts } from "@/lib/products-public.functions";
import { Price } from "@/components/ds/Price";
import { RegisteredStoresCarousel } from "@/components/home/RegisteredStoresCarousel";
import { SmartSearchBar } from "@/components/home/SmartSearchBar";
import { OptimizedBasketSection } from "@/components/home/OptimizedBasketSection";
import { ComparisonStickyBar } from "@/components/home/ComparisonStickyBar";
import { RealtimeMonitoringDashboard } from "@/components/monitoring/RealtimeMonitoringDashboard";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";

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
    meta: [
      { title: "PreçoCerto — Inteligência em Compras de Supermercado" },
      {
        name: "description",
        content:
          "Economize nas compras em Feijó. Compare preços reais em tempo real, monte sua cesta inteligente e descubra onde é mais barato.",
      },
      { property: "og:title", content: "PreçoCerto — Seu assistente inteligente de compras" },
      {
        property: "og:description",
        content: "Inteligência de preços em tempo real em Feijó. Compare mercados, monte sua cesta e economize todos os meses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function HomePage() {
  const [sort, setSort] = useState<"recent" | "price">("recent");
  const { session } = useMyProfile();

  const loaderData = useLoaderData({ from: "/" }) as { stats: any; economy: any; };
  const stats = loaderData?.stats;
  const economy = loaderData?.economy;

  const recentProductsFn = useServerFn(getRecentProducts);
  const { data: rawRecentProducts } = useQuery({
    queryKey: ["home-live-prices"],
    queryFn: () => recentProductsFn({ data: { limit: 10 } }),
    staleTime: 60_000,
  });

  const filteredProducts = useMemo(() => {
    if (!rawRecentProducts) return [];
    let list = [...rawRecentProducts];
    if (sort === "price") {
      list.sort((a, b) => a.price - b.price);
    } else {
      list.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
    }
    return list.slice(0, 8);
  }, [rawRecentProducts, sort]);

  return (
    <div className="min-h-screen bg-[var(--bg-global)] text-[var(--text-primary)]">
      <SiteHeader variant="overlay" />

      {/* Hero Section - Professional Supermarket Interior */}
      <section className="relative h-[480px] md:h-[600px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/60 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-global)] via-transparent to-transparent z-10" />
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000" 
            alt="Interior de um supermercado profissional"
            className="h-full w-full object-cover scale-105"
          />
        </div>

        <div className="pc-shell relative z-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30 text-white text-[11px] font-black uppercase tracking-[0.2em] mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Inteligência Local · Feijó · Acre
              </div>
              <h1 className="t-h1 text-white mb-6">
                Compre melhor.<br/>
                <span className="text-primary">Gaste menos.</span>
              </h1>
              <p className="text-white/80 text-lg md:text-xl mb-10 max-w-2xl leading-relaxed">
                Junte-se a milhares de feijoenses que economizam todos os meses comparando preços em tempo real nos mercados da nossa cidade.
              </p>

              <div className="relative max-w-2xl">
                <SmartSearchBar />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Metrics Bar - Compact container */}
      <div className="mx-auto max-w-[1280px] px-4 -mt-12 relative z-20 mb-20">
        <div className="bg-white border border-[var(--border-subtle)] rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-base)]">
            <StatItem label="Produtos cadastrados" value={stats?.totalItems?.toLocaleString('pt-BR') || "..."} />
            <StatItem label="Preços monitorados" value={stats?.priceRecords?.toLocaleString('pt-BR') || "..."} />
            <StatItem label="Estabelecimentos" value={stats?.establishments?.toLocaleString('pt-BR') || "..."} />
          </div>
          {stats?.generatedAt && (
            <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)] opacity-60">
              <Clock className="h-3 w-3" />
              <span>Dados apurados em: {new Date(stats.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>
      </div>

      <main className="pc-shell space-y-32 pb-32">
        {/* Optimized Baskets Section */}
        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="text-primary text-[11px] font-black uppercase tracking-widest mb-3">Oportunidades de Hoje</div>
              <h2 className="t-h2">Cestas Otimizadas</h2>
              <p className="text-[var(--text-secondary)] mt-2">As combinações mais baratas encontradas nos mercados de Feijó hoje.</p>
            </div>
            <Link to="/cesta" className="text-primary font-bold text-sm flex items-center gap-2 hover:underline">
              Ver todas as cestas <PlusCircle size={16} />
            </Link>
          </div>
          <OptimizedBasketSection />
        </section>

        {/* Live Prices / Search Results preview */}
        <section className="bg-white rounded-[32px] border border-[var(--border-base)] p-8 md:p-12 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="t-h2 mb-2">Preços em Tempo Real</h2>
              <p className="text-[var(--text-secondary)]">Últimas atualizações capturadas pela nossa comunidade.</p>
            </div>
            
            <div className="flex items-center p-1 bg-[var(--bg-global)] rounded-lg">
              <button 
                onClick={() => setSort("recent")}
                className={cn("px-4 py-2 text-xs font-bold rounded-md transition-all", sort === "recent" ? "bg-white shadow-sm text-primary" : "text-[var(--text-secondary)]")}
              >
                Recentes
              </button>
              <button 
                onClick={() => setSort("price")}
                className={cn("px-4 py-2 text-xs font-bold rounded-md transition-all", sort === "price" ? "bg-white shadow-sm text-primary" : "text-[var(--text-secondary)]")}
              >
                Menor Preço
              </button>
            </div>
          </div>

          <div className="overflow-x-auto -mx-8 px-8 md:mx-0 md:px-0">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-[11px] font-black uppercase tracking-widest border-b border-[var(--border-base)]">
                  <th className="py-4 px-2">Produto</th>
                  <th className="py-4 px-2">Mercado</th>
                  <th className="py-4 px-2">Preço</th>
                  <th className="py-4 px-2">Atualizado</th>
                  <th className="py-4 px-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-base)]">
                {filteredProducts.map((p: any) => (
                  <tr key={`${p.name}-${p.when}`} className="group hover:bg-[var(--bg-global)]/50 transition-colors">
                    <td className="py-6 px-2 font-bold text-[var(--text-primary)]">{p.name}</td>
                    <td className="py-6 px-2 text-[var(--text-secondary)] text-sm font-medium">{p.marketName}</td>
                    <td className="py-6 px-2"><Price value={p.price} size="sm" tone="best" className="font-black" /></td>
                    <td className="py-6 px-2 text-[var(--text-tertiary)] text-xs font-bold">{formatDate(p.when)}</td>
                    <td className="py-6 px-2 text-right">
                      <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-primary hover:bg-primary/10">
                        <PlusCircle size={20} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-12 text-center">
             <Button asChild variant="outline" className="rounded-full px-8 h-12 font-bold border-primary text-primary hover:bg-primary/5">
                <Link to="/buscar">Explorar catálogo completo</Link>
             </Button>
          </div>
        </section>

        {/* Partner Stores */}
        <section>
          <div className="text-center mb-12">
            <h2 className="t-h3 uppercase tracking-widest text-[var(--text-tertiary)]">Estabelecimentos Monitorados</h2>
          </div>
          <RegisteredStoresCarousel />
        </section>

        {/* Benefits Section */}
        <section className="grid md:grid-cols-3 gap-8">
          <BenefitCard 
            icon={ShieldCheck} 
            title="Preços verificados" 
            desc="Transparência total: cada preço informa o mercado e o horário exato da última atualização."
          />
          <BenefitCard 
            icon={LineChart} 
            title="Histórico de preços" 
            desc="Analise a tendência dos preços e saiba se uma promoção é realmente vantajosa para você."
          />
          <BenefitCard 
            icon={Zap} 
            title="Cesta inteligente" 
            desc="Nossa IA calcula automaticamente a melhor rota de economia para sua lista de compras."
          />
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden rounded-[40px] bg-navy text-white py-20 px-8 text-center">
          <div className="absolute inset-0 z-0 opacity-20">
            <img 
              src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=2000" 
              alt="" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-navy" />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="t-h2 mb-4">Economia inteligente todos os dias</h2>
            <h3 className="text-xl font-bold mb-8 text-primary">Antes de comprar, compare com o PreçoCerto.</h3>
            <p className="text-white/60 mb-10 text-lg">
              Junte-se a milhares de feijoenses e economize em cada ida ao mercado. Gratuito para sempre para consumidores.
            </p>
            <Button asChild className="pc-button-primary rounded-full px-12 h-14 text-lg shadow-2xl shadow-primary/20">
              <Link to="/cadastro">Criar minha conta gratuita</Link>
            </Button>
          </div>
        </section>

        {/* Professional Monitoring for Merchants */}
        <section id="monitoramento" className="pt-10 border-t border-[var(--border-base)]">
          <div className="mb-12">
            <div className="inline-block px-3 py-1 rounded-lg bg-navy text-white text-[10px] font-black uppercase tracking-widest mb-4">Área Profissional</div>
            <h2 className="t-h2 mb-4">Painel de Inteligência de Mercado</h2>
            <p className="text-[var(--text-secondary)] max-w-3xl">Visão estratégica e monitoramento de concorrência em tempo real para todos os estabelecimentos cadastrados em Feijó.</p>
          </div>
          <RealtimeMonitoringDashboard />
        </section>
      </main>

      <Footer />
      <ComparisonStickyBar />
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-8 md:py-10 text-center">
      <div className="text-3xl font-black text-[var(--brand-primary)] mb-1 tracking-tighter">{value}</div>
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{label}</div>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-white border border-[var(--border-base)] p-8 rounded-[24px] text-left h-full flex flex-col hover:border-primary/30 transition-all group shadow-sm hover:shadow-md">
      <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon size={24} />
      </div>
      <h3 className="font-bold text-xl mb-3 text-[var(--text-primary)]">{title}</h3>
      <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{desc}</p>
    </div>
  );
}
