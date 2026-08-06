import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import Autoplay from "embla-carousel-autoplay";
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
import { formatBRL } from "@/components/ds";
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

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d <= 0) return "hoje";
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d}d`;
  if (d < 30) return `há ${Math.floor(d / 7)}sem`;
  if (d < 365) return `há ${Math.floor(d / 30)}m`;
  return `há ${Math.floor(d / 365)}a`;
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
      className="mt-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <header className="mb-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3 w-3" strokeWidth={2.4} aria-hidden />
            Novidades no catálogo
          </p>
          <h2 className="mt-0.5 text-[17px] font-bold tracking-tight text-foreground md:text-[19px]">
            Produtos recém-cadastrados
          </h2>
        </div>
        <Link
          to="/melhores-precos"
          className="hidden shrink-0 text-[11.5px] font-semibold text-primary hover:underline md:inline"
        >
          Ver catálogo completo →
        </Link>
      </header>

      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: true, dragFree: true }}
        plugins={[Autoplay({ delay: 3800, stopOnInteraction: true, stopOnMouseEnter: true })]}
        className="group/carousel relative"
      >
        <CarouselContent className="-ml-2.5">
          {products.map((p) => {
            const cmp = priceByName.get(norm(p.displayName));
            const slug = cmp?.catalog_slug ?? p.id;
            const price = cmp ? Number(cmp.min_price) : null;
            const avg = cmp ? Number(cmp.avg_price) : null;
            const savings = price != null && avg != null && avg > price
              ? Math.round(((avg - price) / avg) * 100)
              : 0;
            const store = cmp?.cheapest_store ? shortenStoreName(cmp.cheapest_store) : null;

            return (
              <CarouselItem
                key={p.id}
                className="basis-[85%] pl-4 sm:basis-[45%] md:basis-[30%] lg:basis-[25%]"
              >
                <Link
                  to="/produto-publico/$slug"
                  params={{ slug }}
                  aria-label={`Ver ${p.displayName}`}
                  className="group/card relative block h-full overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 shadow-xl transition-all duration-500 hover:-translate-y-2 hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--brand-primary)]/40"

                >
                  {/* Scanning Effect for "Eyeing the product" feature - subtly updated */}
                  <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[12px] opacity-0 group-hover/card:opacity-100 transition-opacity duration-500">
                    <div className="animate-scan absolute left-0 right-0 h-1 bg-[var(--brand-primary)] shadow-[0_0_20px_rgba(108,92,231,1)]" />
                  </div>

                  {/* Corner Glow */}
                  <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[var(--brand-primary)]/10 blur-[40px] opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />

                  <header className="relative z-10 flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-surface-elevated)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] backdrop-blur-sm">
                      <Clock3 className="h-2.5 w-2.5" strokeWidth={3} />
                      {timeAgo(p.createdAt)}
                    </span>
                    {savings >= 5 && (
                      <span className="rounded-full bg-[var(--success)]/10 border border-[var(--success)]/20 px-2.5 py-1 text-[10px] font-bold text-[var(--success)] flex items-center gap-1 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                        <TrendingDown className="h-2.5 w-2.5" />
                        ↓ {savings}%
                      </span>
                    )}
                  </header>

                  <div className="relative z-10 aspect-square w-full overflow-hidden rounded-lg bg-[var(--bg-base)] p-4 transition-transform duration-700 group-hover/card:scale-105">
                    <ProductImage
                      src={cmp?.image_url ?? p.imageUrl}
                      alt={p.displayName}
                      width={320}
                      height={320}
                      className="h-full w-full object-contain drop-shadow-2xl"
                    />
                  </div>

                  <div className="relative z-10 mt-5 space-y-3">
                    <div>
                      {p.brand && (
                        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-[var(--brand-primary)]/60 mb-1">
                          {p.brand}
                        </p>
                      )}
                      <h3 className="line-clamp-2 text-[18px] font-semibold leading-tight tracking-tight text-[var(--text-primary)] group-hover/card:text-[var(--brand-primary)] transition-colors">
                        {p.displayName}
                      </h3>
                    </div>

                    <div className="flex items-end justify-between pt-2">
                      <div className="flex flex-col">
                        {price != null ? (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
                                {formatBRL(price)}
                              </span>
                              {avg != null && avg > price && (
                                <span className="text-xs font-normal text-[var(--text-tertiary)] line-through">
                                  {formatBRL(avg)}
                                </span>
                              )}
                            </div>
                            {store && (
                              <p className="text-[12px] font-medium text-[var(--text-tertiary)] truncate max-w-[120px]">
                                no <span className="text-[var(--text-secondary)]">{store}</span>
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs font-medium text-[var(--text-tertiary)] italic">
                            Monitorando...
                          </span>
                        )}
                      </div>
                      
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--bg-surface-elevated)] text-[var(--brand-primary)] transition-all duration-300 group-hover/card:bg-[var(--brand-primary)] group-hover/card:text-white">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <CarouselPrevious className="left-1 hidden h-9 w-9 border-border bg-background/90 opacity-0 shadow-md backdrop-blur transition-opacity group-hover/carousel:opacity-100 md:flex" />
        <CarouselNext className="right-1 hidden h-9 w-9 border-border bg-background/90 opacity-0 shadow-md backdrop-blur transition-opacity group-hover/carousel:opacity-100 md:flex" />
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
