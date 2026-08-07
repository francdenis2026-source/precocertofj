import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getRealtimeMonitoringStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data: stores } = await supabase.from('establishments').select('id, name, logo_url');
    
    // Simulate real-time variation on top of real stores
    const monitoringData = (stores || []).map(store => {
      // Deterministic randomness based on store ID
      const seed = store.id.charCodeAt(0) + store.id.charCodeAt(store.id.length - 1);
      const random = (offset: number) => (Math.sin(seed + offset + Date.now() / 10000) + 1) / 2;

      return {
        storeId: store.id,
        storeName: store.name,
        storeLogoUrl: store.logo_url,
        status: random(0) > 0.05 ? 'online' : 'offline',
        activeSensors: Math.floor(random(1) * 10) + 5,
        lastSync: new Date().toISOString(),
        insights: [
          { type: 'demand', message: `Alta demanda para ${['Arroz', 'Feijão', 'Açúcar', 'Óleo'][Math.floor(random(2) * 4)]} detectada`, intensity: 'high' },
          { type: 'stock', message: `Estoque baixo: ${['Leite Integral', 'Café', 'Papel Higiênico'][Math.floor(random(3) * 3)]}`, intensity: 'critical' },
          { type: 'price', message: 'Variação de preços detectada na região', intensity: 'medium' }
        ].slice(0, Math.floor(random(4) * 3) + 1)
      };
    });

    return monitoringData;
  });
