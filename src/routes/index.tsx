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
  Clock,
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
    <div className="min-h-screen bg-[var(--bg-global)] text-[var(--text-primary)] selection:bg-[var(--brand-primary)] selection:text-white">
      <SiteHeader variant="overlay" />

      {/* Hero Section — Refined Hierarchy and Depth */}
      <section className="relative min-h-[520px] md:min-h-[640px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A]/98 via-[#0D1B2A]/85 to-[#0D1B2A]/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-global)] via-[#0D1B2A]/20 to-transparent z-10" />

          <motion.img 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=2000" 
            alt="Interior detalhado de corredor de supermercado com prateleiras e produtos"







            className="h-full w-full object-cover"
          />
        </div>

        <div className="pc-shell relative z-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white mb-8 animate-fade-in-up">
                <span className="flex h-2 w-2 rounded-full bg-[var(--brand-primary)] shadow-[0_0_8px_var(--brand-primary)] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inteligência Local · Feijó · Acre</span>
              </div>
              <h1 className="t-hero text-white mb-6 drop-shadow-2xl">
                Compre melhor.<br/>
                <span className="text-[var(--brand-accent)] drop-shadow-sm">Gaste menos.</span>
              </h1>
              <p className="text-slate-100 t-body mb-10 max-w-2xl leading-relaxed font-medium drop-shadow-md">
                Junte-se a milhares de feijoenses que economizam todos os meses comparando preços em tempo real nos mercados da nossa cidade.
              </p>


              <div className="relative max-w-2xl">
                <SmartSearchBar />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar — Unified and Elevated */}
      <div className="pc-shell -mt-10 relative z-30 mb-24">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-white border border-[var(--border-subtle)] rounded-[var(--radius-2xl)] shadow-xl shadow-navy/5 overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
            <StatItem label="Produtos cadastrados" value={stats?.totalItems ? stats.totalItems.toLocaleString('pt-BR') : "..."} />
            <StatItem label="Preços monitorados" value={stats?.priceRecords ? stats.priceRecords.toLocaleString('pt-BR') : "..."} />
            <StatItem label="Estabelecimentos" value={stats?.establishments ? stats.establishments.toLocaleString('pt-BR') : "..."} />
          </div>
          {stats?.generatedAt && (
            <div className="bg-[var(--bg-secondary)]/50 py-3 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] border-t border-[var(--border-subtle)]">
              <Clock className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              <span>Dados atualizados em: {new Date(stats.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </motion.div>
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
        <section className="relative overflow-hidden rounded-[40px] bg-[var(--navy-900)] text-white py-24 px-8 text-center shadow-2xl shadow-navy/20">
          <div className="absolute inset-0 z-0 opacity-20">
            <img 
              src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=2000" 
              alt="" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--navy-900)]/40 to-[var(--navy-900)]" />
          </div>
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="t-kicker mb-4 text-[var(--brand-primary)]">Junte-se à Economia Real</div>
            <h2 className="t-h2 text-white mb-6">Economia inteligente todos os dias</h2>
            <p className="text-white/60 mb-10 text-lg leading-relaxed">
              Junte-se a milhares de feijoenses e economize em cada ida ao mercado. Gratuito para sempre para consumidores.
            </p>
            <Button asChild className="pc-button-primary rounded-full px-12 h-14 text-lg shadow-2xl shadow-[var(--brand-primary)]/40 hover:scale-105 transition-transform">
              <Link to="/cadastro">Começar a economizar agora</Link>
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
      <div className="text-4xl font-black text-[var(--brand-primary)] mb-2 tracking-tighter leading-none">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-tertiary)]">{label}</div>

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
