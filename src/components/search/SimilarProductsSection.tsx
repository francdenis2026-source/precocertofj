import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { searchProductPrice } from "@/lib/price-search.functions";
import { Price } from "@/components/ds/Price";
import { ProductImage } from "@/components/ds/ProductImage";
import { ArrowRight } from "lucide-react";

export function SimilarProductsSection({ query }: { query: string }) {
  const runSearch = useServerFn(searchProductPrice);
  const { data: result } = useQuery({
    queryKey: ["similar-products", query],
    queryFn: () => runSearch({ data: { query } }),
    enabled: !!query,
  });

  if (!result || result.groups.length <= 1) return null;

  // Sugestões de alternativas (pula o primeiro que já está no destaque)
  const alternates = result.groups.slice(1, 5);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Alternativas Inteligentes
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {alternates.map((item) => (
          <div key={item.productName} className="group bg-card border border-border/60 rounded-2xl p-4 hover:border-primary/30 transition-all cursor-pointer">
             <div className="flex gap-3">
               <div className="h-16 w-16 bg-muted/20 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                 <ProductImage name={item.productName} alt={item.productName} size="md" />
               </div>
               <div className="min-w-0 flex-1 space-y-1">
                 <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                   {item.productName}
                 </h3>
                 <div className="flex items-center gap-1.5">
                    <Price value={item.min} size="sm" tone="best" />
                    <span className="text-[10px] font-bold text-savings">-15%</span>
                 </div>
               </div>
             </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
);
