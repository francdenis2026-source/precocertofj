import { useState } from "react";
import { SlidersHorizontal, ChevronDown, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ds/Badge";

export function SearchFiltersPanel({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const sections = [
    {
      id: "brand",
      title: "Marca",
      options: ["Parmalat", "Italac", "Ninho", "Piracanjuba"],
    },
    {
      id: "market",
      title: "Mercado",
      options: ["Varejão Contamigos", "Pague Pouco", "Doce Dia", "Super Econômico"],
    },
    {
      id: "dist",
      title: "Distância",
      options: ["Até 2km", "Até 5km", "Até 10km"],
    },
  ];

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  return (
    <aside className={cn(
      "space-y-6 md:block",
      !isOpen && "hidden md:block"
    )}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" /> Filtros Avançados
        </h2>
        {activeFilters.length > 0 && (
          <button 
            onClick={() => setActiveFilters([])}
            className="text-[10px] font-bold text-destructive hover:underline uppercase tracking-wider"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="space-y-3">
             <h3 className="text-xs font-bold text-foreground flex items-center justify-between">
               {section.title}
               <ChevronDown className="h-3 w-3 text-muted-foreground" />
             </h3>
             <div className="flex flex-wrap gap-2">
                {section.options.map((opt) => {
                  const active = activeFilters.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleFilter(opt)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition-all",
                        active 
                          ? "bg-primary border-primary text-primary-foreground font-bold" 
                          : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
             </div>
          </div>
        ))}

        <div className="space-y-3">
           <h3 className="text-xs font-bold text-foreground">Faixa de Preço</h3>
           <div className="flex items-center gap-2">
              <input 
                type="number" 
                placeholder="Mín" 
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <span className="text-muted-foreground">—</span>
              <input 
                type="number" 
                placeholder="Máx" 
                className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              />
           </div>
        </div>

        <div className="pt-4">
          <label className="flex items-center gap-2 cursor-pointer group">
             <div className="h-4 w-4 rounded border border-border bg-card flex items-center justify-center group-hover:border-primary transition-colors">
                <Check className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
             </div>
             <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">Apenas ofertas verificadas</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
