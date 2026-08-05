import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import Autoplay from "embla-carousel-autoplay";
import { Sparkles, Clock3 } from "lucide-react";
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
                className="basis-[46%] pl-2.5 sm:basis-[32%] md:basis-[24%] lg:basis-[19%]"
              >
                <Link
                  to="/produto-publico/$slug"
                  params={{ slug }}
                  aria-label={`Ver ${p.displayName}`}
                  className="group/card relative block h-full overflow-hidden rounded-2xl border border-white/40 bg-background/85 shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:bg-background/40"
                >
                  {/* Glass highlight on top edge */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/25"
                  />
                  {/* Corner halo — curiosity accent */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/25 blur-2xl opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                  />
                  {/* Sheen sweep on hover */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-[900ms] ease-out group-hover/card:translate-x-full dark:via-white/10"
                  />

                  {/* NEW badge */}
                  <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-foreground/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-background backdrop-blur">
                    <Clock3 className="h-2.5 w-2.5" strokeWidth={2.8} aria-hidden />
                    {timeAgo(p.createdAt)}
                  </span>
                  {savings >= 8 && (
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow">
                      -{savings}%
                    </span>
                  )}

                  <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-muted/30 to-muted/5">
                    <ProductImage
                      src={cmp?.image_url ?? p.imageUrl}
                      alt={p.displayName}
                      width={320}
                      height={320}
                      className="h-full w-full object-contain p-2.5 transition-transform duration-500 group-hover/card:scale-105"
                    />
                  </div>

                  <div className="space-y-1 p-2.5">
                    {p.brand && (
                      <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {p.brand}
                      </p>
                    )}
                    <p className="line-clamp-2 min-h-[2.4em] text-[12px] font-semibold leading-tight text-foreground">
                      {p.displayName}
                    </p>
                    {price != null ? (
                      <div className="pt-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <Price value={price} size="md" />
                          {avg != null && avg > price && (
                            <Price value={avg} size="xs" tone="strike" />
                          )}
                        </div>
                        {store && (
                          <p className="truncate text-[11px] text-muted-foreground">
                            em <span className="font-semibold text-foreground/80">{store}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="pt-0.5 text-[11px] font-medium text-muted-foreground">
                        Preços em breve
                      </p>
                    )}
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
