import { Link } from "@tanstack/react-router";
import { StoreLogoThumb } from "@/components/brand/StoreLogoThumb";
import { Price } from "@/components/ds/Price";
import { cn } from "@/lib/utils";
import { MapPin, Package, ChevronRight, TrendingDown } from "lucide-react";

export interface MarketCardProps {
  id: string;
  name: string;
  neighborhood: string;
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
  maxSavings = 0,
  kind = "mercado",
  className
}: MarketCardProps) {
  const KINDS: Record<string, string> = {
    mercado: "Supermercado",
    farmacia: "Farmácia",
    padaria: "Padaria",
    acougue: "Açougue"
  };

  return (
    <Link
      to="/estabelecimento/$slug"
      params={{ slug: id }} // Simplificado, ideal usar slugifyEstablishment
      className={cn(
        "group block bg-[var(--bg-surface)] rounded-[var(--radius-3xl)] border border-[var(--border-subtle)] p-6 transition-all duration-500 hover:shadow-[var(--shadow-xl)] hover:border-[var(--brand-primary)]/30 hover:-translate-y-2",
        className
      )}
    >
      <div className="flex gap-5">
        <div className="h-20 w-20 shrink-0 rounded-2xl bg-[var(--bg-surface-elevated)] p-3 border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg">
          <StoreLogoThumb src={logoUrl} name={name} className="h-full w-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-[var(--brand-primary)]/20">
              {KINDS[kind || "mercado"] || "Estabelecimento"}
            </span>
            {maxSavings > 0 && (
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <TrendingDown className="inline h-3 w-3 mr-1" />
                -{maxSavings}%
              </span>
            )}
          </div>
          <h3 className="text-xl font-black tracking-tight text-[var(--text-primary)] leading-tight mb-1 truncate group-hover:text-[var(--brand-primary)] transition-colors">
            {name}
          </h3>
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
            <MapPin className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            {neighborhood || "Feijó, AC"}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--text-secondary)]">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[14px] font-black text-[var(--text-primary)] leading-none">{productsCount}</div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mt-1">Produtos</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Online</span>
          </div>
        </div>
        
        <div className="h-10 w-10 rounded-full bg-[var(--bg-surface-elevated)] flex items-center justify-center text-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all shadow-inner">
          <ChevronRight className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}
