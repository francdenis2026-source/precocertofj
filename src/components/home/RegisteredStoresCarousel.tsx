import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, useReducedMotion } from "framer-motion";
import { listPublicStores } from "@/lib/stores-public.functions";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";

export function RegisteredStoresCarousel() {
  const fetchStores = useServerFn(listPublicStores);
  const shouldReduceMotion = useReducedMotion();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDrag, setIsDrag] = useState(false);

  const { data: stores, isLoading } = useQuery({
    queryKey: ["home-registered-stores"],
    queryFn: () => fetchStores(),
    staleTime: 30 * 60_000,
  });

  if (isLoading || !stores || stores.length === 0) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 w-16 shrink-0 animate-pulse rounded-xl bg-slate-700/50" />
        ))}
      </div>
    );
  }

  // Triple the stores for infinite scroll effect (only if not reducing motion)
  const displayStores = shouldReduceMotion ? stores : [...stores, ...stores, ...stores];

  return (
    <div className="relative w-full overflow-hidden">
      {/* Fade Edges */}
      <div className="absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[var(--bg-base)] to-transparent pointer-events-none opacity-50" />
      <div className="absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[var(--bg-base)] to-transparent pointer-events-none opacity-50" />

      {shouldReduceMotion ? (
        <div className="flex gap-6 py-4 px-2 overflow-x-auto no-scrollbar scroll-smooth snap-x">
          {stores.map((store) => (
            <Link
              key={store.id}
              to="/estabelecimento/$id"
              params={{ id: store.id }}
              className="group flex flex-col items-center gap-2 shrink-0 snap-start"
            >
              <div className={cn(
                "h-16 w-16 flex items-center justify-center rounded-xl border border-white/10 bg-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] p-2.5 transition-all duration-300",
                "group-hover:border-[var(--brand-primary)]"
              )}>
                <StoreLogoThumb 
                  src={store.logoUrl} 
                  name={store.name} 
                  className="h-full w-full border-none p-0 bg-transparent"
                  imgClassName="object-contain"
                  initialsClassName="text-slate-900 font-bold text-[12px]"
                />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)] transition-colors truncate max-w-[80px]">
                {store.name.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <motion.div 
          ref={carouselRef}
          drag="x"
          dragConstraints={{ left: -(88 * stores.length * 2), right: 0 }}
          onDragStart={() => setIsDrag(true)}
          onDragEnd={() => setTimeout(() => setIsDrag(false), 50)}
          className="flex gap-6 py-4 px-2 cursor-grab active:cursor-grabbing will-change-transform"
          animate={isDrag ? undefined : { x: [0, -(88 * stores.length)] }}
          transition={{ 
            x: {
              duration: stores.length * 6,
              repeat: Infinity,
              ease: "linear",
              repeatType: "loop"
            }
          }}
        >
          {displayStores.map((store, i) => (
            <Link
              key={`${store.id}-${i}`}
              to="/estabelecimento/$id"
              params={{ id: store.id }}
              onClick={(e) => {
                if (isDrag) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              className="group flex flex-col items-center gap-2 shrink-0 pointer-events-auto"
            >
              <div className={cn(
                "h-16 w-16 flex items-center justify-center rounded-xl border border-white/10 bg-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)] p-2.5 transition-all duration-300 backface-visibility-hidden transform-gpu",
                "group-hover:border-[var(--brand-primary)] group-hover:scale-105 group-hover:-translate-y-1"
              )}>
                <StoreLogoThumb 
                  src={store.logoUrl} 
                  name={store.name} 
                  className="h-full w-full border-none p-0 bg-transparent"
                  imgClassName="object-contain"
                  initialsClassName="text-slate-900 font-bold text-[12px]"
                />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)] transition-colors truncate max-w-[80px]">
                {store.name.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
              </span>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
