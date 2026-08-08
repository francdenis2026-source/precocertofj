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
          <div key={i} className="h-20 rounded-[var(--radius-lg)] animate-pulse bg-slate-100 dark:bg-slate-800" />
        ))}
      </>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {stores.slice(0, 12).map((store) => (

        <Link
          key={store.id}
          to="/loja/$id"
          params={{ id: store.id }}
          search={{ q: "", from: "" }}
          className="group relative flex flex-col items-center justify-center p-3 gap-2 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--brand-primary)]/40 transition-all duration-300"
        >
          <div className="relative z-10 h-10 w-10 flex items-center justify-center rounded-[var(--radius-md)] bg-white p-1.5 shadow-sm group-hover:scale-110 transition-transform duration-300">
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
          <span className="relative z-10 text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors truncate w-full px-1 text-center">
            {store.name.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
          </span>
        </Link>
      ))}
    </div>

  );
}
