import { Link } from "@tanstack/react-router";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { ContamigosLogo } from "@/components/brand/ContamigosLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface MarketCardProps {
  id: string;
  name: string;
  neighborhood?: string | null;
  productsCount: number;
  logoUrl?: string | null;
  maxSavings?: number;
  kind?: string | null;
  className?: string;
}

export function MarketCard({
  id,
  name,
  neighborhood,
  productsCount,
  logoUrl,
  maxSavings,
  kind,
  className
}: MarketCardProps) {
  return (
    <article className={cn(
      "group flex flex-col bg-white rounded-[32px] border border-[#E5EAF1] p-6 shadow-sm transition-all duration-500 hover:shadow-xl hover:shadow-[#2563EB]/5 hover:-translate-y-1.5",
      className
    )}>
      <div className="flex items-center gap-4 mb-8">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-[#F8FAFC] border border-[#E5EAF1] p-2 flex items-center justify-center shadow-inner overflow-hidden group-hover:scale-105 transition-transform duration-500">
          {name.includes("Contamigos") ? (
            <ContamigosLogo size="sm" hideName />
          ) : (
            <StoreLogoThumb 
              src={logoUrl} 
              name={name} 
              className="h-full w-full border-none p-0 bg-transparent brightness-95 contrast-110"
              imgClassName="object-contain"
              initialsClassName="text-[#0F172A] font-bold text-xs"
            />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-black text-[#0F172A] leading-tight truncate group-hover:text-[#2563EB] transition-colors">{name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">{kind || "Estabelecimento"}</span>
            <span className="h-1 w-1 rounded-full bg-[#E5EAF1]" />
            <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">{neighborhood || "Centro"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-[#E5EAF1]">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-0.5">
            {productsCount > 0 ? "Produtos" : "Status"}
          </div>
          <div className="text-lg font-black text-[#0F172A]">
            {productsCount > 0 ? productsCount : "Catálogo sendo atualizado"}
          </div>
        </div>
        
        <Button asChild size="sm" className="rounded-full px-6 font-bold shadow-lg shadow-[#2563EB]/10 bg-[#2563EB] hover:bg-[#1D4ED8]">
          <Link to="/loja/$id" params={{ id }}>Ver preços</Link>
        </Button>
      </div>
    </article>
  );
}
