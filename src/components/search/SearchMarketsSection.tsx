import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ds/Badge";
import { MapPin, Star, TrendingUp } from "lucide-react";
import { useSignedLogoUrls } from "@/hooks/use-signed-logo-urls";

export function SearchMarketsSection() {
  const { data: establishments } = useQuery({
    queryKey: ["markets-summary"],
    queryFn: async () => {
      const { data } = await supabase
        .from("establishments")
        .select("*")
        .limit(4);
      return data ?? [];
    },
  });

  const logoUrls = useSignedLogoUrls(establishments?.map(e => e.logo_url) ?? []);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Mercados com Ofertas
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {establishments?.map((market, i) => (
          <div key={market.id} className="group bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/30 transition-all">
             <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 bg-white rounded-xl shadow-sm border border-border/40 p-2 flex items-center justify-center overflow-hidden">
                  {logoUrls[i] ? (
                    <img src={logoUrls[i]} alt={market.name} className="h-full w-full object-contain" />
                  ) : (
                    <div className="text-[10px] font-black text-primary">{market.name.substring(0,2).toUpperCase()}</div>
                  )}
                </div>
                <Badge variant="savingsSoft" size="sm">
                   <TrendingUp className="h-3 w-3 mr-1" /> Top 5
                </Badge>
             </div>
             
             <div className="space-y-1 mb-4">
               <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{market.name}</h3>
               <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                  <MapPin className="h-3 w-3" /> {market.address?.split(',')[0] || 'Centro'}
               </div>
             </div>

             <div className="flex items-center justify-between pt-4 border-t border-border/40">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] font-bold text-foreground">4.8</span>
                </div>
                <button className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">
                  Ver Tabloide
                </button>
             </div>
          </div>
        ))}
      </div>
    </section>
  );
}
