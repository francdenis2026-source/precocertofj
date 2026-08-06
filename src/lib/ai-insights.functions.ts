import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPriceInsights = createServerFn({ method: "POST" })
  .validator((input) => z.object({
    id: z.string(),
    slug: z.string(),
    productName: z.string(),
    currentPrice: z.number(),
    history: z.array(z.object({ price: z.number(), date: z.string() })),
    minPrice: z.number().optional(),
    avgPrice: z.number().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    // Em um sistema real, aqui chamaríamos a IA Gateway da Lovable com o histórico.
    // Por agora, vamos simular uma lógica de recomendação baseada em dados.
    
    const { history, currentPrice, avgPrice, minPrice } = data;
    if (history.length < 2) {
      return {
        insight: "Ainda não temos dados históricos suficientes para uma análise profunda, mas o preço atual parece justo em relação à média da cidade.",
        recommendation: "Pode comprar agora se precisar, mas monitore para ver se surgem promoções.",
        trend: "Estável"
      };
    }

    const lastPrice = history[history.length - 2]?.price;
    const isDropping = currentPrice < (lastPrice || currentPrice);
    const isCheap = currentPrice <= (minPrice || currentPrice) * 1.05;
    const isHigh = avgPrice && currentPrice > avgPrice * 1.1;

    let insight = "";
    let recommendation = "";
    let trend = isDropping ? "Queda" : currentPrice > (lastPrice || 0) ? "Alta" : "Estável";

    if (isCheap) {
      insight = `Este produto está com um preço excelente, muito próximo ao menor valor já registrado (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minPrice || 0)}).`;
      recommendation = "Oportunidade ideal de compra! É improvável que caia muito mais nos próximos dias.";
    } else if (isHigh) {
      insight = `O preço atual está cerca de ${Math.round(((currentPrice / (avgPrice || 1)) - 1) * 100)}% acima da média histórica.`;
      recommendation = "Se não for urgente, recomendamos esperar alguns dias ou procurar em outro mercado.";
    } else if (isDropping) {
      insight = "Detectamos uma tendência de queda recente no valor deste item.";
      recommendation = "Aproveite a redução, mas se a queda começou agora, pode valer a pena esperar o fim de semana.";
    } else {
      insight = "O valor se mantém estável e dentro da média praticada nos últimos 30 dias.";
      recommendation = "Compra segura. Não prevemos grandes variações para os próximos dias.";
    }

    return { insight, recommendation, trend };
  });
