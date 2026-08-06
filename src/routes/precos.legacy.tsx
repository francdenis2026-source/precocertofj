import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Suspense, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  ChevronRight, 
  Package, 
  AlertCircle, 
  Loader2,
  TrendingDown,
  Info
} from "lucide-react";
import { searchProductPrice } from "@/lib/price-search.functions";
import { Price } from "@/components/ds/Price";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ds/Badge";

export const Route = createFileRoute("/precos/legacy")({
  head: () => ({
    meta: [
      { title: "Consulta de Preços — PreçoCerto" },
      { name: "description", content: "Consulte os preços de produtos em todos os mercados de Feijó." },
    ],
  }),
  component: PriceLookupPage,
});

function PriceLookupPage() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const runSearch = useServerFn(searchProductPrice);

  const { data: result, isLoading, isError, error } = useQuery({
    queryKey: ["price-consultation", searchTerm],
    queryFn: () => runSearch({ data: { query: searchTerm } }),
    enabled: searchTerm.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSearchTerm(query.trim());
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 md:px-6 pb-20">
        <PageHeader
          title="Consulta de Preços"
          description="Pesquise produtos para ver os valores praticados nos estabelecimentos de nossa Feijó."
        />

        <div className="mb-8 max-w-2xl">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nome do produto ou marca..."
                  className="pl-10 h-12 rounded-xl border-border/60 bg-card/50 backdrop-blur-sm focus-visible:ring-primary/20"
                />
              </div>
              <Button type="submit" className="h-12 px-6 rounded-xl font-bold gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Consultar
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest px-1">
              Dica: Tente "Arroz 5kg", "Óleo" ou "Café"
            </p>
          </form>
        </div>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center space-y-4"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Buscando as melhores ofertas...</p>
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center"
            >
              <AlertCircle className="mx-auto h-10 w-10 text-destructive/60 mb-4" />
              <h3 className="text-lg font-black text-foreground mb-2">Erro ao buscar preços</h3>
              <p className="text-sm text-muted-foreground">{(error as Error)?.message || "Ocorreu um problema na conexão. Tente novamente."}</p>
            </motion.div>
          ) : searchTerm && (!result?.groups || result.groups.length === 0) ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-border/60 bg-card/30 p-12 text-center"
            >
              <Package className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-black text-foreground mb-2">Nenhum produto encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Não encontramos "<strong>{searchTerm}</strong>" no momento. Tente um termo mais simples ou verifique a grafia.
              </p>
            </motion.div>
          ) : result?.groups ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <TrendingDown className="h-3 w-3" /> {result.samples} ofertas encontradas
                </h2>
              </div>

              <div className="grid gap-4">
                {result.groups.map((group, idx) => (
                  <motion.div
                    key={group.productName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group overflow-hidden rounded-[24px] border border-border/60 bg-white dark:bg-card/40 hover:border-primary/40 transition-all hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-[1fr,auto] gap-6 items-center">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <Badge variant="primary" size="sm" className="font-black text-[9px] uppercase tracking-widest bg-primary/10 text-primary border-none">
                             {group.samples} {group.samples === 1 ? 'Oferta' : 'Ofertas'}
                           </Badge>
                           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                             Visto em {new Date(group.lastSeen).toLocaleDateString('pt-BR')}
                           </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black text-foreground leading-none group-hover:text-primary transition-colors">
                          {group.productName}
                        </h3>
                      </div>

                      <div className="flex items-center gap-8 bg-muted/20 p-4 rounded-2xl border border-border/40">
                         <div className="text-center md:text-right">
                           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">A partir de</p>
                           <Price value={group.min} size="lg" tone="best" />
                         </div>
                         <div className="w-px h-10 bg-border/40 hidden md:block" />
                         <div className="text-center md:text-right hidden sm:block">
                           <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Média</p>
                           <Price value={group.avg} size="md" />
                         </div>
                         <Button asChild size="icon" variant="ghost" className="rounded-full hover:bg-primary hover:text-primary-foreground transition-all">
                           <ChevronRight className="h-5 w-5" />
                         </Button>
                      </div>
                    </div>

                    <div className="bg-muted/10 border-t border-border/20 px-6 py-3 flex flex-wrap gap-4">
                       {group.prices.slice(0, 3).map((p, pIdx) => (
                         <div key={pIdx} className="flex items-center gap-2 text-[11px] font-bold">
                           <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                           <span className="text-foreground">{p.marketName}</span>
                           <Price value={p.price} size="sm" className="opacity-80" />
                         </div>
                       ))}
                       {group.prices.length > 3 && (
                         <span className="text-[11px] font-bold text-muted-foreground italic">
                           + {group.prices.length - 3} outros estabelecimentos
                         </span>
                       )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 flex flex-col items-center justify-center text-center opacity-60"
            >
              <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Pesquise para começar</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Digite o nome do produto no campo acima para ver a comparação de preços.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
