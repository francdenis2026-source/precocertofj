import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { listPublicStores } from "@/lib/stores-public.functions";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function RegisteredStoresCarousel() {
  const fetchStores = useServerFn(listPublicStores);
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

  // Double the stores for infinite scroll effect
  const displayStores = [...stores, ...stores, ...stores];

  return (
    <div className="relative w-full overflow-hidden">
      {/* Fade Edges */}
      <div className="absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-800 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-800 to-transparent pointer-events-none" />
      
      <motion.div 
        className="flex gap-6 py-2"
        animate={{ x: [0, -100 * stores.length] }}
        transition={{ 
          duration: stores.length * 3, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      >
        {displayStores.map((store, i) => (
          <Link
            key={`${store.id}-${i}`}
            to="/estabelecimento/$id"
            params={{ id: store.id }}
            className="group flex flex-col items-center gap-2 shrink-0"
          >
            <div className={cn(
              "h-16 w-16 flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/50 p-2 transition-all duration-300",
              "group-hover:border-indigo-500/50 group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
            )}>
              <StoreLogoThumb 
                src={store.logoUrl} 
                name={store.name} 
                className="h-full w-full border-none p-0 bg-transparent"
                imgClassName="object-contain"
                initialsClassName="text-white/40 text-[10px]"
                vector
              />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/20 group-hover:text-indigo-400 transition-colors truncate max-w-[80px]">
              {store.name}
            </span>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
