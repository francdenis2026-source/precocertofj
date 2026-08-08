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
    <>
      {stores.slice(0, 9).map((store) => (
        <Link
          key={store.id}
          to="/loja/$id"
          params={{ id: store.id }}
          search={{ q: "", from: "" }}
          className="pc-card group flex flex-col items-center justify-center p-2 gap-1 text-center h-auto min-h-[64px] border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/50 hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--brand-primary)]/30 transition-all shadow-none hover:shadow-sm"
        >
          <div className="h-6 w-6 flex items-center justify-center rounded-[var(--radius-sm)] bg-white p-0.5 shadow-sm group-hover:scale-105 transition-transform overflow-hidden relative">
            {store.name.includes("Contamigos") ? (
              <ContamigosLogo size="xs" hideName />
            ) : (
              <StoreLogoThumb 
                src={store.logoUrl} 
                name={store.name} 
                className="h-full w-full border-none p-0 bg-transparent"
                imgClassName="object-contain"
                initialsClassName="text-slate-900 font-bold text-[8px]"
              />
            )}
            {/* Overlay sutil para garantir que o fundo branco não suma se a imagem falhar */}
            <div className="absolute inset-0 -z-10 bg-slate-50/50" />
          </div>
          <span className="text-[8px] font-bold uppercase tracking-tight text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)] transition-colors truncate w-full px-1">
            {store.name.split(/\s+·\s+|\s+-\s+|,\s+/)[0].replace(/^(MERCEARIA|SUPERMERCADO|PANIFICADORA|ACOUGUE|DISTRIBUIDORA)\s+/i, '')}
          </span>
        </Link>
      ))}
    </>
  );
}
