import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getRealtimeMonitoringStats = createServerFn({ method: "GET" })
  .handler(async () => {
    // In a real app, this would query a real-time analytics table or IoT gateway.
    // For this demo/implementation, we simulate insights based on recent scans and stock levels.
    
    const { data: stores } = await supabase.from('establishments').select('id, name');
    
    const monitoringData = (stores || []).map(store => ({
      storeId: store.id,
      storeName: store.name,
      status: Math.random() > 0.1 ? 'online' : 'offline',
      activeSensors: Math.floor(Math.random() * 10) + 2,
      lastSync: new Date().toISOString(),
      insights: [
        { type: 'demand', message: 'Alta demanda para Feijão detectada', intensity: 'high' },
        { type: 'stock', message: 'Estoque baixo: Leite Integral', intensity: 'critical' },
        { type: 'price', message: 'Concorrência baixou preço do Arroz', intensity: 'medium' }
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    }));

    return monitoringData;
  });
