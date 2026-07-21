import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin, Store as StoreIcon, Trophy, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignedLogoUrl } from "@/hooks/use-signed-logo-urls";
import type { PublicStore } from "@/lib/stores-public.functions";

interface StoreCardProps {
  store: PublicStore;
  onOpen: (store: PublicStore) => void;
  wins?: number;
  isTop?: boolean;
  featured?: boolean;
}

/**
 * StoreCard editorial (compact) — used in the home markets hub.
 */
export function StoreCard({ store, onOpen, wins = 0, isTop = false, featured = false }: StoreCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const resolvedLogo = useSignedLogoUrl(store.logoUrl);
  const showBackdrop = resolvedLogo && !imgFailed;
  const showLogo = resolvedLogo && !logoFailed;


  return (
    <motion.div
      layout
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={cn(
        "hairline-gold group relative flex h-[140px] w-[156px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-surface text-left shadow-sm md:w-[172px]",
        "focus-within:ring-2 focus-within:ring-accent/60 focus-within:ring-offset-2 focus-within:ring-offset-background",
        featured && "border-accent/40 ring-1 ring-accent/25",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(store)}
        aria-label={`Ver detalhes de ${store.name}`}
        className="flex flex-1 flex-col text-left outline-none"
      >
        {/* Hero band */}
        <div className="relative h-10 overflow-hidden">
          {showBackdrop ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30" />
              )}
              <img
                src={resolvedLogo ?? undefined}
                alt=""
                aria-hidden
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgFailed(true)}
                className={cn(
                  "absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-md saturate-125 transition-opacity duration-500",
                  imgLoaded ? "opacity-70" : "opacity-0",
                )}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/55 via-primary/25 to-accent/45 mix-blend-multiply" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/70 via-primary/40 to-accent/55">
              <span
                aria-hidden
                className="absolute -right-1 -top-1 font-display text-[44px] font-black leading-none text-primary-foreground/15"
              >
                {store.name.trim().charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-surface to-transparent" />

          {/* Top-right badges */}
          <div className="absolute right-1 top-1 flex items-center gap-1">
            {isTop && (
              <span className="inline-flex items-center gap-0.5 rounded-sm border border-accent/70 bg-accent/95 px-1 py-[1px] font-display text-[8px] italic tracking-wide text-accent-foreground shadow-[0_1px_2px_color-mix(in_oklab,black_25%,transparent)]">
                <Trophy className="h-2 w-2" strokeWidth={2.5} />
                Top
              </span>
            )}
            {!isTop && wins > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-sm border border-savings/60 bg-savings/95 px-1 py-[1px] font-display text-[8px] italic tracking-wide text-savings-foreground shadow-sm">
                <TrendingDown className="h-2 w-2" strokeWidth={2.5} />
                {wins}
              </span>
            )}
          </div>

          {/* Logo chip */}
          <div className="absolute -bottom-2 left-2">
            {showLogo ? (
              <div className="relative h-7 w-7">
                {!logoLoaded && (
                  <div className="absolute inset-0 animate-pulse rounded-[3px] border-2 border-surface bg-muted" />
                )}
                <img
                  src={resolvedLogo ?? undefined}
                  alt={store.name}
                  onLoad={() => setLogoLoaded(true)}
                  onError={() => setLogoFailed(true)}
                  className={cn(
                    "h-7 w-7 rounded-[3px] border-2 border-surface bg-surface object-contain shadow-sm ring-1 ring-accent/40 transition-opacity duration-300",
                    logoLoaded ? "opacity-100" : "opacity-0",
                  )}
                  loading="lazy"
                  decoding="async"
                  width={28}
                  height={28}
                  draggable={false}
                />
              </div>
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-[3px] border-2 border-surface bg-primary/12 text-primary shadow-sm ring-1 ring-accent/40">
                <StoreIcon className="h-3 w-3" strokeWidth={1.75} />
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col px-2 pb-1 pt-2.5">
          <p className="line-clamp-1 font-display text-[12px] font-semibold leading-tight tracking-tight text-foreground">
            {store.name}
          </p>
          <p className="mt-0.5 flex items-center gap-0.5 truncate font-display text-[9px] italic text-muted-foreground">
            <MapPin className="h-2 w-2 shrink-0 text-accent" />
            {store.city}/{store.state}
          </p>
          <div className="mt-1 flex items-end justify-between border-t border-accent/30 pt-1">
            <p className="num font-display text-[12px] font-semibold text-foreground leading-none">
              {store.productCount}
              <span className="ml-0.5 font-display text-[8.5px] italic font-normal text-muted-foreground">
                itens
              </span>
            </p>
            <ChevronRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
          </div>
        </div>
      </button>

      {/* "Ver preços" CTA */}
      <Link
        to="/loja/$id"
        params={{ id: store.id }}
        aria-label={`Ver preços de ${store.name}`}
        style={{
          borderTop: "1px solid transparent",
          backgroundImage:
            "linear-gradient(var(--color-surface), var(--color-surface)), linear-gradient(90deg, color-mix(in oklab, var(--color-accent) 10%, transparent), color-mix(in oklab, var(--color-accent) 70%, transparent) 50%, color-mix(in oklab, var(--color-accent) 10%, transparent))",
          backgroundOrigin: "border-box",
          backgroundClip: "padding-box, border-box",
        }}
        className="bg-primary/[0.04] px-2 py-1 text-center font-display text-[10px] italic tracking-wide text-primary transition hover:bg-primary hover:text-primary-foreground hover:not-italic focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:outline-none"
      >
        Ver preços <span className="not-italic">→</span>
      </Link>
    </motion.div>
  );
}

export function StoreCardSkeleton() {
  return (
    <div className="flex h-[140px] w-[156px] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm md:w-[172px]">
      <div className="h-10 animate-pulse bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
      <div className="flex-1 space-y-1 px-2 pb-1 pt-2.5">
        <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-2.5 w-1/3 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-5 animate-pulse border-t border-border bg-muted/60" />
    </div>
  );
}
