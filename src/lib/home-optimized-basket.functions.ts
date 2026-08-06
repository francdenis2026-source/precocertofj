import { createServerFn } from "@tanstack/react-start";
import { 
  getBasketComparison, 
  ESSENTIALS, 
  type EssentialKey, 
  type BasketComparisonResult 
} from "./basket.functions";

/**
 * Retorna as 3 cestas mais baratas baseadas nos essenciais do PreçoCerto.
 * Focada na economia total para exibição na Homepage.
 */
export const getOtimizedBaskets = createServerFn({ method: "GET" })
  .handler(async (): Promise<{
    baskets: Array<{
      id: string;
      name: string;
      total: number;
      marketName: string;
      marketId: string;
      logoUrl: string | null;
      itemsCount: number;
      totalItems: number;
      savingsVsAvg: number;
      economyPct: number;
    }>;
    lastUpdate: string;
  }> => {
    // Busca a comparação padrão (Feijó inteira, sem filtros de raio)
    const comparison = await getBasketComparison({ data: {} });
    
    // Filtra mercados com pelo menos 50% de cobertura para não exibir cestas "falsamente" baratas
    const validStores = comparison.stores
      .filter(s => s.coverage >= 0.5)
      .sort((a, b) => a.total - b.total);

    const baskets = validStores.slice(0, 3).map((store, idx) => {
      const avgTotal = comparison.averageBasketTotal;
      const savings = Math.max(0, avgTotal - store.total);
      const economyPct = avgTotal > 0 ? (savings / avgTotal) * 100 : 0;

      const names = ["Cesta Econômica", "Cesta Família", "Cesta Essencial"];

      return {
        id: store.establishmentId,
        name: names[idx] || `Oferta ${store.establishmentName}`,
        total: store.total,
        marketName: store.establishmentName,
        marketId: store.establishmentId,
        logoUrl: store.logoUrl,
        itemsCount: store.itemsFound,
        totalItems: store.totalItems,
        savingsVsAvg: Number(savings.toFixed(2)),
        economyPct: Number(economyPct.toFixed(1))
      };
    });

    return {
      baskets,
      lastUpdate: new Date().toISOString()
    };
  });
