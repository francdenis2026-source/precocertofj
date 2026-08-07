import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, useReducedMotion } from "framer-motion";
import { listPublicStores } from "@/lib/stores-public.functions";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { ContamigosLogo } from "@/components/brand/ContamigosLogo";

export function RegisteredStoresCarousel() {
  const fetchStores = useServerFn(listPublicStores);
  const { data: stores, isLoading } = useQuery({
    queryKey: ["home-registered-stores"],
    queryFn: () => fetchStores(),
    staleTime: 30 * 60_000,
  });

  if (isLoading || !stores || stores.length === 0) {
    return (
      <>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </>
    );
  }

  return (
    <>
      {stores.slice(0, 6).map((store) => (
        <Link
          key={store.id}
          to="/loja/$id"
          params={{ id: store.id }}
          search={{ q: "", from: "" }}
          className="pc-card group flex flex-col items-center justify-center p-4 gap-2 text-center h-auto min-h-[100px]"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-white p-1.5 shadow-sm group-hover:scale-110 transition-transform">
            {store.name.includes("Contamigos") ? (
              <ContamigosLogo size="sm" hideName />
            ) : (
              <StoreLogoThumb 
                src={store.logoUrl} 
                name={store.name} 
                className="h-full w-full border-none p-0 bg-transparent"
                imgClassName="object-contain"
                initialsClassName="text-slate-900 font-bold text-[10px]"
              />
            )}
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)] transition-colors truncate w-full">
            {store.name.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
          </span>
        </Link>
      ))}
    </>
  );
}
