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
    <div className="flex items-center gap-8 overflow-x-auto no-scrollbar py-2">
      {stores.slice(0, 12).map((store) => (
        <Link
          key={store.id}
          to="/loja/$id"
          params={{ id: store.id }}
          search={{ q: "", from: "" }}
          className="group shrink-0 flex items-center gap-3 transition-all grayscale hover:grayscale-0 opacity-60 hover:opacity-100"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-white p-1.5 shadow-sm">
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
          <span className="text-[12px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
            {store.name.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
          </span>
        </Link>
      ))}
    </div>
  );
}
