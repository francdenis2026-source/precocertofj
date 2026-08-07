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
} from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { getPlatformStats } from "@/lib/stores-public.functions";
import { getEconomyStat, getRecentProducts } from "@/lib/products-public.functions";
import { cn } from "@/lib/utils";
import { Price } from "@/components/ds/Price";
import { CATEGORIES } from "@/lib/categories";
import { RegisteredStoresCarousel } from "@/components/home/RegisteredStoresCarousel";
import { ProductQuickView } from "@/components/product/ProductQuickView";
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
      { title: "PricePal — Your Intelligent Shopping Assistant" },
      {
        name: "description",
        content:
          "PricePal tracks real supermarket prices in Feijó, ranks the best basket for you, and shows exactly where to shop to save more.",
      },
      { property: "og:title", content: "PricePal — Your Intelligent Shopping Assistant" },
      {
        property: "og:description",
        content: "Live supermarket price intelligence for Feijó. Compare stores, build a smart basket, and save on every trip.",
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
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
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
      className="pc-card group relative flex cursor-pointer items-center gap-4 overflow-hidden !p-4"
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          addItem({ id: p.name, name: p.name, price: p.price, marketName: p.marketName || "" });
        }}
        className="absolute right-3 top-3 z-10 rounded-xl bg-[var(--bg-surface-elevated)] p-2 text-[var(--brand-primary)] opacity-0 transition-all hover:bg-[var(--brand-primary)] hover:text-[var(--text-on-brand)] focus-visible:opacity-100 group-hover:opacity-100"
        aria-label={`Add ${p.name} to comparison`}
      >
        <PlusCircle className="h-4 w-4" />
      </button>
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]">
        <img 
          src={`https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=200&h=200&market=${p.marketName}&product=${p.name}`} 
          alt={p.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
             (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=111827&color=F4B400&bold=true`;
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-[var(--brand-primary)]">{p.marketName}</span>
          <span className="shrink-0 text-[13px] text-[var(--text-tertiary)]">· {formatDate(p.when)}</span>
        </div>
        <h3 className="truncate text-[16px] font-semibold leading-snug tracking-[-0.01em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--brand-primary)]">
          {p.name}
        </h3>
        <div className="mt-1">
          <Price value={p.price} size="md" className="font-semibold" />
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
    <div className="min-h-dvh overflow-x-hidden bg-[var(--bg-base)] pb-20 text-[var(--text-primary)] selection:bg-[var(--brand-primary)]/30 lg:pb-0">
      <SiteHeader variant="overlay" />

      {/* Hero */}
      <section className="relative isolate overflow-hidden px-4 pb-20 pt-16 md:px-8 md:pb-28 md:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--brand-primary)] opacity-[0.09] blur-[140px]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent" />
        </div>

        <div className="mx-auto max-w-[1440px]">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-[var(--brand-primary)]" aria-hidden="true" />
              <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                Live price intelligence for Feijó, Acre
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="text-balance text-[clamp(2.5rem,6vw,4rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--text-primary)]"
            >
              Shop smarter.{" "}
              <span className="text-[var(--brand-primary)]">Spend less.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-6 max-w-xl text-pretty text-[18px] leading-relaxed text-[var(--text-secondary)]"
            >
              PricePal tracks real supermarket prices across your city, builds the cheapest
              basket for you, and tells you exactly where to buy.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-10 max-w-2xl"
            >
              <SmartSearchBar />
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {CATEGORIES.slice(0, 5).map((cat) => (
                  <Link
                    key={cat.slug}
                    to="/buscar"
                    search={{ c: cat.value } as any}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 text-[14px] font-medium text-[var(--text-secondary)] transition-all hover:-translate-y-0.5 hover:border-[var(--brand-primary)]/40 hover:text-[var(--text-primary)]"
                  >
                    {cat.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Trust bar */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            <TrustStat label="Price records" value={stats?.priceRecords} />
            <TrustStat label="Products tracked" value={stats?.totalItems} />
            <TrustStat label="Average savings" value={economy?.avgSavingsPct} suffix="%" />
            <TrustStat label="Partner stores" value={stats?.establishments} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] px-4 pb-24 md:px-8">
        {/* Value props */}
        <section aria-labelledby="how-it-works" className="mb-24">
          <SectionHeading
            id="how-it-works"
            kicker="Why PricePal"
            title="An assistant, not just a price list"
            description="Every price is audited, timestamped and ranked so you can trust the recommendation before you leave home."
          />
          <div className="grid gap-6 md:grid-cols-3">
            <ValueCard
              Icon={ShieldCheck}
              title="Verified prices"
              body="Each entry is sourced from a registered store and stamped with the date it was collected."
            />
            <ValueCard
              Icon={LineChart}
              title="Real price history"
              body="Track how a product moves over time and know whether today's offer is genuinely a deal."
            />
            <ValueCard
              Icon={Zap}
              title="Optimised baskets"
              body="Add your list and PricePal computes the cheapest split across stores, including a single-stop option."
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
           <div className="space-y-24 lg:col-span-8">
              <section id="baskets-section" aria-label="Smart basket">
                <OptimizedBasketSection />
              </section>

              <section aria-labelledby="live-prices">
                <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
                  <div className="min-w-0">
                    <p className="mb-2 text-[13px] font-medium uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                      Live monitoring
                    </p>
                    <h2
                      id="live-prices"
                      className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
                    >
                      Latest prices near you
                    </h2>
                  </div>
                  <div className="flex w-fit rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1">
                    {[
                      { id: "recent", label: "Newest" },
                      { id: "price", label: "Cheapest" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSort(s.id as any)}
                        aria-pressed={sort === s.id}
                        className={cn(
                          "min-h-9 rounded-[var(--radius-sm)] px-4 text-[14px] font-medium transition-all",
                          sort === s.id
                            ? "bg-[var(--brand-primary)] text-[var(--text-on-brand)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {filteredProducts.map((p, i) => (
                    <ProductCardItem key={`${p.name}-${p.when}`} p={p} i={i} onSelect={setSelectedProduct} />
                  ))}
                </div>
              </section>
           </div>
           
           <aside className="space-y-12 lg:col-span-4">
              <section aria-labelledby="partners">
                 <h2 id="partners" className="mb-6 text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                   Partner stores
                 </h2>
                 <div className="grid grid-cols-2 gap-3">
                   <RegisteredStoresCarousel />
                 </div>
              </section>
              <section>
                <PromoBanner />
              </section>
            </aside>
        </div>

        {/* Categories */}
        <section aria-labelledby="categories" className="mt-24">
          <SectionHeading
            id="categories"
            kicker="Browse"
            title="Shop by category"
            description="Standardised across every partner store, so comparisons stay apples-to-apples."
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((cat, idx) => (
              <CategoryCard key={cat.slug} label={cat.label} value={cat.value} Icon={cat.Icon} index={idx} />
            ))}
          </div>
        </section>

        <section aria-labelledby="realtime" className="mt-24 border-t border-[var(--border-subtle)] pt-16">
          <SectionHeading
            id="realtime"
            kicker="Live panel"
            title="Store monitoring in real time"
            description="A rotating view of what each registered store is offering right now."
          />
          <div className="mx-auto max-w-4xl">
            <RealtimeMonitoringDashboard />
          </div>
        </section>

        <ComparisonStickyBar />

        {/* Closing CTA */}
        <section className="relative mt-28 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)]">
          <img
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=2000"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--bg-base)] via-[var(--bg-base)]/80 to-[var(--bg-base)]/40" />
          <div className="relative flex flex-col items-center px-6 py-20 text-center md:py-28">
            <h2 className="max-w-2xl text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.025em] text-[var(--text-primary)]">
              Real transparency for every trip to the store
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[18px] leading-relaxed text-[var(--text-secondary)]">
              Join shoppers in Feijó who check PricePal before they buy.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild className="pc-button-primary">
                <Link to="/buscar">
                  Start saving <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="pc-button-secondary">
                <Link to="/estabelecimentos">
                  <Store className="h-4 w-4" aria-hidden="true" /> Browse stores
                </Link>
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

      <MobileBottomNav />
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-6 text-center">
      <p className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        {display === null ? "—" : `${display.toLocaleString("en-US")}${suffix}`}
      </p>
      <p className="mt-2 text-[14px] text-[var(--text-tertiary)]">{label}</p>
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
