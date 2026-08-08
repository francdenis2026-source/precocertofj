import { createFileRoute, useLoaderData, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  LineChart,
  Sparkles,
  Store,
  Zap,
  TrendingDown,
  CheckCircle2,
  Search,
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat, getRecentProducts } from "@/lib/products-public.functions";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { RegisteredStoresCarousel } from "@/components/home/RegisteredStoresCarousel";
import { SmartSearchBar } from "@/components/home/SmartSearchBar";
import { OptimizedBasketSection } from "@/components/home/OptimizedBasketSection";
import { ComparisonStickyBar } from "@/components/home/ComparisonStickyBar";
import { useComparisonList } from "@/hooks/use-comparison-list";
import { RealtimeMonitoringDashboard } from "@/components/monitoring/RealtimeMonitoringDashboard";
import { useMyProfile } from "@/hooks/useMyProfile";

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
      { title: "PreçoCerto — Compare Preços de Supermercados" },
      {
        name: "description",
        content:
          "Economize nas compras de mercado em Feijó. Compare preços reais, monte sua cesta e descubra onde é mais barato.",
      },
      { property: "og:title", content: "PreçoCerto — Seu assistente inteligente de compras" },
      {
        property: "og:description",
        content: "Inteligência de preços em tempo real. Compare mercados, monte sua cesta e economize.",
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
      <section className="relative h-[480px] md:h-[560px] flex items-center overflow-hidden">
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
      <div className="mx-auto max-w-[1280px] px-4 -mt-8 relative z-20">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-base)] rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[var(--border-base)]">
            <StatItem label="Preços verificados" value={stats?.priceRecords?.toLocaleString('pt-BR') || "..."} />
            <StatItem label="Produtos" value={stats?.totalItems?.toLocaleString('pt-BR') || "..."} />
            <StatItem label="Economia média" value={economy?.avgSavingsPct ? `${economy.avgSavingsPct}%` : "..."} />
            <StatItem label="Lojas parceiras" value={stats?.establishments?.toLocaleString('pt-BR') || "..."} />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1280px] px-4 py-20 space-y-24">
        {/* Why Use PreçoCerto */}
        <section className="text-center max-w-4xl mx-auto">
          <h2 className="t-h2 mb-4">Por que usar o PreçoCerto?</h2>
          <p className="text-[var(--text-secondary)] mb-12">Compare com confiança antes de comprar.</p>
          <div className="grid md:grid-cols-3 gap-6">
            <BenefitCard 
              icon={ShieldCheck} 
              title="Preços verificados" 
              desc="Cada preço informa mercado e data da atualização."
            />
            <BenefitCard 
              icon={LineChart} 
              title="Histórico de preços" 
              desc="Veja se uma promoção realmente vale a pena."
            />
            <BenefitCard 
              icon={Zap} 
              title="Cesta inteligente" 
              desc="Descubra a combinação mais barata para sua lista."
            />
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-[var(--bg-surface-elevated)] -mx-4 px-4 py-16 rounded-[40px]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="t-h3 mb-12 uppercase tracking-widest text-[var(--text-secondary)]">Como funciona</h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
              <Step number="1" title="Busque" desc="Encontre o produto ou monte sua lista." />
              <div className="hidden md:block text-[var(--border-strong)]">→</div>
              <Step number="2" title="Compare" desc="Veja os preços disponíveis nos mercados locais." />
              <div className="hidden md:block text-[var(--border-strong)]">→</div>
              <Step number="3" title="Economize" desc="Escolha onde sua compra fica mais barata." />
            </div>
          </div>
        </section>

        {/* Smart Baskets */}
        <section>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <h2 className="t-h2 mb-2">Sua lista. O menor preço possível.</h2>
              <p className="text-[var(--text-secondary)]">O PreçoCerto calcula automaticamente onde comprar cada item para economizar mais.</p>
            </div>
            <Button asChild className="pc-button-primary rounded-full px-8">
              <Link to="/cesta">Montar minha cesta</Link>
            </Button>
          </div>
          <OptimizedBasketSection />
        </section>

        {/* Cesta Básica Premium / Veredito */}
        <section className="bg-[var(--bg-surface)] border border-[var(--brand-primary)]/10 rounded-[40px] p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles size={120} className="text-[var(--brand-primary)]" />
          </div>
          <div className="max-w-3xl">
            <h2 className="t-h2 mb-4">Veredito da Cesta Básica</h2>
            <p className="text-[var(--text-secondary)] mb-8 text-lg">
              Acompanhe qual mercado tem o menor custo total para os 15 itens essenciais hoje em Feijó.
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <div className="bg-[var(--bg-surface-elevated)] px-6 py-4 rounded-2xl border border-[var(--border-subtle)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Itens Monitorados</p>
                <p className="text-2xl font-black text-[var(--brand-primary)]">15 Essenciais</p>
              </div>
              <div className="bg-[var(--bg-surface-elevated)] px-6 py-4 rounded-2xl border border-[var(--border-subtle)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-1">Atualização</p>
                <p className="text-2xl font-black text-[var(--brand-primary)]">Tempo Real</p>
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 mb-8">
              <h4 className="font-bold text-[var(--brand-primary)] mb-2 flex items-center gap-2">
                <ShieldCheck size={18} />
                Recurso PreçoCerto+
              </h4>
              <p className="text-sm text-[var(--text-secondary)]">
                O ranking detalhado e a exportação do Veredito da Cesta Básica são exclusivos para assinantes ou através do uso de créditos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="pc-button-primary rounded-full px-8 h-12">
                <Link to="/planos">Assinar PreçoCerto+</Link>
              </Button>
              <Button variant="outline" asChild className="rounded-full px-8 h-12 border-[var(--border-subtle)]">
                <Link to="/cesta-basica">Ver Veredito Geral</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Partner Markets - faiza horizontal */}
        <section className="border-y border-[var(--border-subtle)] py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <h2 className="t-h3 font-bold">Compare preços nos mercados da sua cidade</h2>
            <Link to="/estabelecimentos" className="text-[var(--brand-primary)] font-bold flex items-center gap-2 hover:underline">
              Ver todos os mercados <ArrowRight size={16} />
            </Link>
          </div>
          <RegisteredStoresCarousel />
        </section>

        {/* Recent Prices - Table format */}
        <section>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-4 border-b border-[var(--border-subtle)]">
            <h2 className="t-h2">Últimos preços registrados</h2>
            <div className="flex gap-2 p-1 bg-[var(--bg-surface-elevated)] rounded-xl">
              <button 
                onClick={() => setSort("recent")}
                className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", sort === "recent" ? "bg-[var(--brand-primary)] text-white shadow-md" : "text-[var(--text-secondary)]")}
              >
                Recentes
              </button>
              <button 
                onClick={() => setSort("price")}
                className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", sort === "price" ? "bg-[var(--brand-primary)] text-white shadow-md" : "text-[var(--text-secondary)]")}
              >
                Menor preço
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[var(--text-tertiary)] text-[11px] font-bold uppercase tracking-widest border-b border-[var(--border-subtle)]">
                  <th className="py-4 px-2">Produto</th>
                  <th className="py-4 px-2">Mercado</th>
                  <th className="py-4 px-2">Preço</th>
                  <th className="py-4 px-2">Atualizado</th>
                  <th className="py-4 px-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredProducts.map((p: any) => (
                  <tr key={`${p.name}-${p.when}`} className="group hover:bg-[var(--bg-surface-elevated)]/50 transition-colors">
                    <td className="py-4 px-2 font-bold">{p.name}</td>
                    <td className="py-4 px-2 text-[var(--text-secondary)] text-sm">{p.marketName}</td>
                    <td className="py-4 px-2"><Price value={p.price} size="sm" /></td>
                    <td className="py-4 px-2 text-[var(--text-tertiary)] text-xs">{formatDate(p.when)}</td>
                    <td className="py-4 px-2 text-right">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-[var(--brand-primary)]">
                        <PlusCircle size={18} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 text-center">
             <Link to="/precos" className="pc-button-secondary rounded-full">Ver mais preços →</Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden rounded-[40px] bg-slate-950 text-white py-16 px-8 text-center">
          <div className="absolute inset-0 -z-10 opacity-30">
            <img src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=2000" alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>
          <h2 className="t-h2 mb-4">Economia inteligente</h2>
          <h3 className="text-xl font-bold mb-6 text-[var(--brand-primary)]">Antes de comprar, compare.</h3>
          <p className="text-slate-300 max-w-xl mx-auto mb-8">Veja onde sua lista fica mais barata e economize em cada ida ao mercado.</p>
          <Button asChild className="pc-button-primary rounded-full px-12 h-14 text-lg shadow-xl shadow-[var(--brand-primary)]/20">
            <Link to="/cadastro">Começar a economizar</Link>
          </Button>
        </section>

        {/* Monitoramento em Tempo Real - Administradores e Parceiros */}
        <section id="monitoramento" className="pt-20 border-t border-[var(--border-subtle)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="t-h2 mb-2">Monitoramento Profissional</h2>
              <p className="text-[var(--text-secondary)]">Visão estratégica do mercado em tempo real para parceiros e administradores.</p>
            </div>
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
    <div className="px-6 py-8 text-center">
      <div className="text-3xl font-black text-[var(--brand-primary)] mb-1">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">{label}</div>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 rounded-2xl text-left h-full flex flex-col justify-center min-h-[160px] hover:border-[var(--brand-primary)]/30 transition-colors group">
      <div className="flex items-center gap-4 mb-3">
        <div className="h-10 w-10 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center group-hover:scale-110 transition-transform">
          <Icon size={20} />
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center max-w-[200px]">
      <div className="h-12 w-12 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center font-black text-xl mb-4 shadow-lg shadow-[var(--brand-primary)]/20">
        {number}
      </div>
      <h3 className="font-bold mb-2">{title}</h3>
      <p className="text-xs text-[var(--text-tertiary)] font-medium leading-relaxed">{desc}</p>
    </div>
  );
}
