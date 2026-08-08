import { createFileRoute, useLoaderData, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Footer } from "@/components/brand/Footer";
import { Button } from "@/components/ui/button";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat, getRecentProducts } from "@/lib/products-public.functions";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { CATEGORIES } from "@/lib/categories";
import { RegisteredStoresCarousel } from "@/components/home/RegisteredStoresCarousel";
import { ProductQuickView } from "@/components/product/ProductQuickView";
import { ProductImage } from "@/components/ds/ProductImage";
import { SmartSearchBar } from "@/components/home/SmartSearchBar";
import { PromoBanner } from "@/components/promo/PromoBanner";
import { OptimizedBasketSection } from "@/components/home/OptimizedBasketSection";
import { ComparisonStickyBar } from "@/components/home/ComparisonStickyBar";
import { useComparisonList } from "@/hooks/use-comparison-list";
import { RealtimeMonitoringDashboard } from "@/components/monitoring/RealtimeMonitoringDashboard";

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
      { title: "PreçoCerto — Seu assistente inteligente de compras" },
      {
        name: "description",
        content:
          "O PreçoCerto acompanha os preços reais dos supermercados de Feijó, monta a melhor cesta para você e mostra exatamente onde comprar para economizar.",
      },
      { property: "og:title", content: "PreçoCerto — Seu assistente inteligente de compras" },
      {
        property: "og:description",
        content: "Inteligência de preços em tempo real para Feijó. Compare mercados, monte uma cesta inteligente e economize em cada compra.",
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
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function ProductCardItem({ p, i, onSelect }: { p: any; i: number; onSelect: (p: any) => void }) {
  const { addItem } = useComparisonList();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(i * 0.06, 0.3), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onSelect({ 
        name: p.name, 
        minPrice: p.price, 
        cheapestStore: p.marketName,
        updatedAt: p.when
      })}
      className="pc-card group relative flex cursor-pointer items-center gap-4 !p-4"
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          addItem({ id: p.name, name: p.name, price: p.price, marketName: p.marketName || "" });
        }}
        className="absolute right-3 top-3 z-10 rounded-[var(--radius-xl)] bg-[var(--bg-surface-elevated)] p-2 text-[var(--brand-primary)] opacity-0 transition-all hover:bg-[var(--brand-primary)] hover:text-[var(--text-on-brand)] focus-visible:opacity-100 group-hover:opacity-100 shadow-[var(--shadow-sm)]"
        aria-label={`Adicionar ${p.name} à comparação`}
      >
        <PlusCircle className="h-4 w-4" />
      </button>
      <div className="hidden">
        {/* Imagem removida conforme solicitação do usuário */}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="truncate text-[11px] md:text-[13px] font-medium text-[var(--brand-primary)]">{p.marketName}</span>
          <span className="shrink-0 text-[11px] md:text-[13px] text-[var(--text-tertiary)]">· {formatDate(p.when)}</span>
        </div>
        <h3 className="truncate text-[14px] md:text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-primary)]">
          {p.name}
        </h3>
        <div className="mt-1">
          <Price value={p.price} size="sm" className="font-semibold" />
        </div>
      </div>
    </motion.div>
  );
}

function HomePage() {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [sort, setSort] = useState<"recent" | "price">("recent");

  const loaderData = useLoaderData({ from: "/" }) as { stats: any; economy: any; };
  const stats = loaderData?.stats;
  const economy = loaderData?.economy;

  const recentProductsFn = useServerFn(getRecentProducts);
  const { data: rawRecentProducts } = useQuery({
    queryKey: ["home-live-prices"],
    queryFn: () => recentProductsFn({ data: { limit: 12 } }),
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
    return list.slice(0, 6);
  }, [rawRecentProducts, sort]);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-[var(--bg-base)] pb-20 text-[var(--text-primary)] selection:bg-[var(--brand-primary)]/30 lg:pb-0">
      <SiteHeader variant="overlay" />

      {/* Modern Hero Section */}
      <section className="relative isolate min-h-[60vh] md:min-h-[85vh] flex flex-col items-center justify-center pt-20 overflow-hidden">
        {/* Immersive Background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)]/40 via-[var(--bg-base)]/10 to-[var(--bg-base)] z-10" />
          <motion.img 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            src="https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&q=80&w=2000" 
            alt="Supermercado realista background"
            className="h-full w-full object-cover brightness-[0.9] saturate-[1.2] blur-[1px] md:blur-0"
          />
        </div>

        <div className="mx-auto max-w-[1440px] px-4 md:px-8 w-full flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl"
          >
            <h1 className="t-hero text-balance mb-4 md:mb-6">
              Compre melhor.{" "}
              <span className="text-[var(--brand-primary)]">Gaste menos.</span>
            </h1>
            <p className="mt-2 md:mt-4 max-w-2xl mx-auto text-pretty text-[16px] md:text-[22px] leading-relaxed text-[var(--text-secondary)] px-4">
              Compare preços reais, monte sua cesta e descubra onde economizar em cada compra.
            </p>
          </motion.div>

          {/* Centralized Search Bar */}
          <div className="relative z-50 w-full max-w-3xl mt-8 md:mt-12 mb-6 md:mb-10 px-4 md:px-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <SmartSearchBar />
              
              {/* Trust Badges */}
              <div className="mt-6 md:mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-8 opacity-80 md:opacity-100">
                <div className="flex items-center gap-2 group cursor-help">
                  <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-[var(--success)] animate-pulse" />
                  <span className="text-[11px] md:text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider group-hover:text-[var(--text-primary)] transition-colors">
                    Verificados
                  </span>
                </div>
                <div className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                <div className="flex items-center gap-2 group cursor-help">
                  <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-[var(--brand-accent)]" />
                  <span className="text-[11px] md:text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider group-hover:text-[var(--text-primary)] transition-colors">
                    Ao Vivo
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-2 group cursor-help">
                  <div className="h-1 w-1 rounded-full bg-[var(--border-strong)]" />
                  <Store className="h-4 w-4 text-[var(--brand-primary)]" />
                  <span className="text-[13px] font-bold text-[var(--text-secondary)] uppercase tracking-wider group-hover:text-[var(--text-primary)] transition-colors">
                    Mercados locais
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] px-4 pb-24 md:px-8 relative z-0 w-full overflow-hidden">
        {/* Platform Stats Section */}
        <section className="relative -mt-10 md:-mt-16 mb-12 md:mb-20 z-20">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-px md:bg-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur-xl shadow-[var(--shadow-lg)]">
              <StatCard label="Preços Verificados" value={stats?.priceRecords || "3.064"} icon={ShieldCheck} />
              <StatCard label="Itens no Catálogo" value={stats?.totalItems || "20.262"} icon={Zap} />
              <StatCard label="Economia Média" value={`${economy?.avgSavingsPct || "15.1"}%`} icon={TrendingDown} />
              <StatCard label="Lojas Conectadas" value={stats?.establishments || "12"} icon={Store} />
            </div>
          </div>
        </section>

        {/* Value props - Hidden on very small mobile for compactness */}
        <section aria-labelledby="how-it-works" className="mb-12 hidden sm:block">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <SectionHeading
                id="how-it-works"
                kicker="Por que o PreçoCerto"
                title="Um assistente, não apenas uma lista de preços"
                description="Cada preço é auditado, datado e ranqueado para você confiar na recomendação antes de sair de casa."
              />
              <div className="grid gap-6 md:grid-cols-1">
                <ValueCard
                  Icon={ShieldCheck}
                  title="Preços verificados"
                  body="Cada registro vem de um mercado cadastrado e traz a data em que foi coletado."
                />
                <ValueCard
                  Icon={LineChart}
                  title="Histórico real de preços"
                  body="Acompanhe a variação do produto ao longo do tempo e saiba se a oferta de hoje vale mesmo a pena."
                />
                <ValueCard
                  Icon={Zap}
                  title="Cestas otimizadas"
                  body="Adicione sua lista e o PreçoCerto calcula a divisão mais barata entre os mercados, inclusive em uma única parada."
                />
              </div>
            </div>
            
            <div className="lg:col-span-5 relative hidden lg:block">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative aspect-square overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-strong)] bg-slate-900 shadow-[var(--shadow-lg)]"
              >
                <img 
                  src="https://images.unsplash.com/photo-1543083477-4f7f45ad7d15?auto=format&fit=crop&q=80&w=1000" 
                  alt="Análise técnica de preços e tecnologia"
                  onLoad={(e) => {
                    if (e.currentTarget.naturalWidth > 0) {
                      e.currentTarget.style.opacity = "1";
                    } else {
                      e.currentTarget.style.display = "none";
                    }
                  }}
                  className="h-full w-full object-cover saturate-[1.1] hover:scale-105 transition-all duration-700 opacity-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)]/30 to-transparent pointer-events-none" />
                
                {/* Floating detail for premium feel */}
                <div className="absolute top-4 right-4 bg-[var(--brand-primary)]/10 backdrop-blur-md border border-[var(--brand-primary)]/20 px-3 py-1.5 rounded-full">
                  <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">Qualidade Auditada</span>
                </div>
              </motion.div>
              
              {/* Decorative background element */}
              <div className="absolute -bottom-6 -left-6 -z-10 h-32 w-32 bg-[var(--brand-primary)]/5 blur-3xl rounded-full" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
           <div className="space-y-16 lg:col-span-8">
              <section id="baskets-section" aria-label="Cesta inteligente" className="scroll-mt-24">
                <OptimizedBasketSection />
              </section>

              <section aria-labelledby="live-prices" className="scroll-mt-24">
                <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
                  <div className="min-w-0">
                    <p className="mb-2 text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
                      Monitoramento ao vivo
                    </p>
                    <h2
                      id="live-prices"
                      className="text-[28px] font-bold tracking-tight text-[var(--text-primary)]"
                    >
                      Últimos preços registrados
                    </h2>
                  </div>
                  <div className="flex w-fit rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 shadow-sm">
                    {[
                      { id: "recent", label: "Recentes" },
                      { id: "price", label: "Menor Preço" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSort(s.id as any)}
                        aria-pressed={sort === s.id}
                        className={cn(
                          "min-h-10 rounded-[var(--radius-md)] px-5 text-[12px] font-bold uppercase tracking-wider transition-all",
                          sort === s.id
                            ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)] shadow-md"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)]",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {filteredProducts.map((p, i) => (
                    <ProductCardItem key={`${p.name}-${p.when}`} p={p} i={i} onSelect={setSelectedProduct} />
                  ))}
                </div>
              </section>
           </div>
           
           <aside className="lg:col-span-4">
              <div className="sticky top-28 space-y-10">
                <section aria-labelledby="partners" className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur-xl p-8 shadow-sm">
                   <h2 id="partners" className="mb-6 text-[12px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] border-b border-[var(--border-subtle)] pb-4">
                     Mercados Parceiros
                   </h2>
                    <div className="flex flex-col gap-4">
                      <RegisteredStoresCarousel />
                    </div>
                 </section>

                 
                 <section className="overflow-hidden rounded-[var(--radius-xl)] shadow-lg transition-transform hover:scale-[1.02] duration-300">
                   <PromoBanner />
                 </section>
              </div>
            </aside>
        </div>

        <section id="realtime" aria-labelledby="realtime" className="mt-20 border-t border-[var(--border-subtle)] pt-20">
          <div className="mx-auto max-w-7xl">
            <RealtimeMonitoringDashboard />
          </div>
        </section>

        <ComparisonStickyBar />

        {/* Closing CTA */}
        <section className="relative mt-20 overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/50 min-h-[300px] flex items-center justify-center">
          <div className="absolute inset-0 -z-10 bg-slate-900">
            <img
              src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=2000"
              alt="Corredor de supermercado moderno e organizado"
              aria-hidden="true"
              loading="lazy"
              onLoad={(e) => {
                if (e.currentTarget.naturalWidth > 0) {
                  e.currentTarget.style.opacity = "1";
                } else {
                  e.currentTarget.style.display = "none";
                }
              }}
              className="h-full w-full object-cover saturate-[0.8] brightness-[0.2] blur-[1px] opacity-0 transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-base)] via-transparent to-[var(--bg-base)]/80" />
          </div>
          
          <div className="relative flex flex-col items-center px-6 py-16 text-center md:py-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="mb-6 rounded-full bg-[var(--brand-primary)]/10 px-4 py-1.5 border border-[var(--brand-primary)]/20"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)]">Economia Inteligente</span>
            </motion.div>
            <h2 className="max-w-2xl text-balance text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-tight tracking-[-0.025em] text-[var(--text-primary)]">
              Transparência real em cada ida ao mercado
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--text-secondary)]">
              Junte-se a quem, em Feijó, consulta o PreçoCerto antes de comprar.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" className="rounded-xl px-8 font-bold shadow-lg shadow-[var(--brand-primary)]/20 active:scale-95 transition-transform" asChild>
                <Link to="/cadastro" search={{ redirect: "/" }}>Começar a economizar</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {selectedProduct && (
        <ProductQuickView 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center transition-colors hover:bg-[var(--bg-surface-hover)] md:border-r md:border-[var(--border-subtle)] last:border-0">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--brand-primary)_12%,transparent)] text-[var(--brand-primary)]">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-[28px] font-extrabold tracking-tight text-[var(--text-primary)]">
        {value}
      </div>
      <div className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
        {label}
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  kicker,
  title,
  description,
}: {
  id: string;
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-10 max-w-2xl">
      <p className="mb-2 text-[13px] font-medium uppercase tracking-[0.14em] text-[var(--brand-primary)]">{kicker}</p>
      <h2 id={id} className="text-[clamp(1.5rem,3vw,2.25rem)] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-[17px] leading-relaxed text-[var(--text-secondary)]">{description}</p>
      )}
    </div>
  );
}

function ValueCard({ Icon, title, body }: { Icon: any; title: string; body: string }) {
  return (
    <div className="pc-card pc-lift">
      <span className="mb-5 grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-[color-mix(in_oklab,var(--brand-primary)_14%,transparent)] text-[var(--brand-primary)]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mb-2 text-[18px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">{title}</h3>
      <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}

function TrustStat({ label, value, suffix = "" }: { label: string; value?: number | null; suffix?: string }) {
  const display = typeof value === "number" && Number.isFinite(value) ? value : null;
  return (
    <div className="group relative rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-6 text-center transition-all hover:border-[var(--brand-primary)]/30 hover:shadow-lg">
      <p className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-primary)]">
        {display === null ? "—" : `${display.toLocaleString("pt-BR")}${suffix}`}
      </p>
      <p className="mt-2 text-[14px] font-medium text-[var(--text-tertiary)]">{label}</p>
      
      {/* Tooltip explicativo discreto */}
      <div className="absolute inset-x-0 -bottom-8 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
        <span className="bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-3 py-1 rounded-md text-[10px] text-[var(--text-secondary)] whitespace-nowrap shadow-sm">
          {label === "Preços Verificados" && "Etiquetas reais conferidas hoje"}
          {label === "Itens no Catálogo" && "Total de produtos identificados"}
          {label === "Economia Direta" && "Sua economia potencial média"}
          {label === "Lojas Conectadas" && "Estabelecimentos ativos em Feijó"}
        </span>
      </div>
    </div>
  );
}

function CategoryCard({ label, value, Icon, index }: { label: string; value: string; Icon: any; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link 
        to="/buscar" 
        search={{ c: value } as any}
        className="group relative flex min-h-[128px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--brand-primary)]/40 hover:shadow-[var(--pc-shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"
      >
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/10 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="relative z-10 grid h-12 w-12 place-items-center rounded-[var(--radius-md)] bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] transition-all duration-300 group-hover:bg-[var(--brand-primary)] group-hover:text-[var(--text-on-brand)]">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h3 className="relative z-10 text-center text-[15px] font-medium text-[var(--text-primary)]">{label}</h3>
      </Link>
    </motion.div>
  );
}
