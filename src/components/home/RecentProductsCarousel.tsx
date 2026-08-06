import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Sparkles, Clock3, ArrowRight, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ProductImage } from "@/components/product/ProductImage";
import { getHomeShowcase, type HomeShowcase } from "@/lib/home-showcase.functions";
import { supabase } from "@/integrations/supabase/client";
import { shortenStoreName } from "@/lib/store-name";
import { Price } from "@/components/ds/Price";

type StoreEntry = {
  establishment_id: string;
  store_name: string;
  price: number;
  product_name: string;
};

type Comparison = {
  product_key: string;
  display_name: string;
  size_value: number | null;
  size_unit: string;
  store_count: number;
  min_price: number;
  avg_price: number;
  cheapest_store: string;
  image_url: string | null;
  catalog_slug: string | null;
  stores: StoreEntry[];
};

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

function formatDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function RecentProductsCarousel() {
  const fetchData = useServerFn(getHomeShowcase);
  const { data, isLoading } = useQuery<HomeShowcase>({
    queryKey: ["home-showcase"],
    queryFn: () => fetchData(),
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: comparisons } = useQuery<Comparison[]>({
    queryKey: ["price-comparisons-home", { limit: 100 }],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_price_comparisons",
        { p_limit: 100 } as never,
      );
      if (error) throw error;
      return (data as unknown as Comparison[]) ?? [];
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
  });

  const products = data?.products ?? [];

  const priceByName = useMemo(() => {
    const map = new Map<string, Comparison>();
    for (const c of comparisons ?? []) map.set(norm(c.display_name), c);
    return map;
  }, [comparisons]);

  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setSelected(api.selectedScrollSnap());
      setSnapCount(api.scrollSnapList().length);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  if (isLoading && products.length === 0) {
    return (
      <section aria-label="Carregando produtos recém-cadastrados" className="mt-4">
        <div className="mb-2 h-4 w-52 animate-pulse rounded-full bg-muted" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[240px] w-[180px] shrink-0 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <motion.section
      aria-label="Produtos recém-cadastrados"
      className="mt-2 relative"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className="absolute top-0 right-0 bottom-0 w-24 bg-gradient-to-l from-[var(--bg-base)]/80 to-transparent z-20 pointer-events-none hidden md:block" />

      <header className="mb-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} aria-hidden />
            Catálogo Vivo
          </p>
          <h2 className="mt-0.5 text-[15px] font-black tracking-tight text-[var(--text-primary)] md:text-[17px]">
            Novidades Recentes
          </h2>
        </div>
        <Link
          to="/buscar"
          className="hidden shrink-0 text-[10px] font-black uppercase tracking-wider text-[var(--brand-primary)] hover:underline md:inline transition-colors"
        >
          Ver tudo →
        </Link>
      </header>

      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: false, dragFree: true, skipSnaps: true }}
        className="group/carousel relative"
      >
        <CarouselContent className="-ml-4">
          {products.map((p) => {
            const cmp = priceByName.get(norm(p.displayName));
            const price = cmp ? Number(cmp.min_price) : null;
            const avg = cmp ? Number(cmp.avg_price) : null;
            const savings = price != null && avg != null && avg > price
              ? Math.round(((avg - price) / avg) * 100)
              : 0;
            const store = cmp?.cheapest_store ? shortenStoreName(cmp.cheapest_store) : null;

            return (
                <CarouselItem
                  key={p.id}
                  className="basis-[85%] pl-4 sm:basis-[45%] md:basis-[33%] lg:basis-[25%] xl:basis-[20%] snap-start"
                >
                <div
                  onClick={() => window.dispatchEvent(new CustomEvent('open-quick-view', { detail: { 
                    name: p.displayName,
                    unit: cmp?.size_unit || null,
                    minPrice: price,
                    maxPrice: null,
                    cheapestStore: store,
                    storeCount: cmp?.store_count || 0,
                    updatedAt: p.createdAt
                  }}))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent('open-quick-view', { detail: { 
                        name: p.displayName,
                        unit: cmp?.size_unit || null,
                        minPrice: price,
                        maxPrice: null,
                        cheapestStore: store,
                        storeCount: cmp?.store_count || 0,
                        updatedAt: p.createdAt
                      }}));
                    }
                  }}
                  aria-label={`Ver ${p.displayName}`}
                  className="group/card relative block h-full overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--brand-primary)]/40 hover:shadow-xl cursor-pointer active:scale-[0.98]"
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--brand-primary)]/5 blur-[40px] opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />

                  <header className="relative z-10 flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-surface-elevated)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-[var(--text-tertiary)] backdrop-blur-sm">
                      <Clock3 className="h-2.5 w-2.5" strokeWidth={3} />
                      {formatDate(p.createdAt)}
                    </span>
                    {savings >= 2 && (
                      <span className="rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 px-2 py-0.5 text-[9px] font-black text-[var(--success)] flex items-center gap-1">
                        <TrendingDown className="h-2.5 w-2.5" />
                        ↓ {savings}%
                      </span>
                    )}
                  </header>

                  <div className="relative z-10 aspect-square w-full overflow-hidden rounded-xl bg-[var(--bg-base)] p-3 transition-all duration-700 ease-out group-hover/card:scale-105 group-hover/card:shadow-inner">
                    <ProductImage
                      src={cmp?.image_url ?? p.imageUrl}
                      alt={p.displayName}
                      width={320}
                      height={320}
                      className="h-full w-full object-contain drop-shadow-md"
                    />
                  </div>

                  <div className="relative z-10 mt-4 space-y-2">
                    <div>
                      {p.brand && (
                        <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-0.5">
                          {p.brand}
                        </p>
                      )}
                      <h3 className="line-clamp-1 text-[15px] font-bold leading-tight tracking-tight text-[var(--text-primary)] group-hover/card:text-[var(--brand-primary)] transition-colors">
                        {p.displayName}
                      </h3>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col">
                        {price != null ? (
                          <>
                            <div className="flex items-baseline gap-1.5">
                              <Price 
                                value={price} 
                                size="lg" 
                                className="font-black tracking-tight"
                              />
                            </div>
                            {store && (
                              <p className="text-[10px] font-medium text-[var(--text-tertiary)] truncate max-w-[100px]">
                                no <span className="text-[var(--text-secondary)] font-bold">{store}</span>
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-[var(--text-tertiary)] italic">
                            Monitorando...
                          </span>
                        )}
                      </div>
                      
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--text-tertiary)] transition-all duration-300 group-hover/card:bg-[var(--brand-primary)] group-hover/card:text-white">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <CarouselPrevious className="left-[-20px] h-10 w-10 border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)] hover:text-white dark:hover:text-black transition-all shadow-xl z-20" />
        <CarouselNext className="right-[-20px] h-10 w-10 border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--brand-primary)] hover:text-white dark:hover:text-black transition-all shadow-xl z-20" />
      </Carousel>

      {snapCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist" aria-label="Navegação do carrossel">
          {Array.from({ length: snapCount }).map((_, i) => {
            const active = i === selected;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`Ir para slide ${i + 1}`}
                onClick={() => api?.scrollTo(i)}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (active ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50")
                }
              />
            );
          })}
        </div>
      )}
    </motion.section>
  );
}