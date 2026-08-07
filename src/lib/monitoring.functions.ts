import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getRealtimeMonitoringStats = createServerFn({ method: "GET" })
  .handler(async () => {
    // 1. Fetch establishments
    const { data: stores } = await supabase
      .from('establishments')
      .select('id, name, logo_url')
      .order('name', { ascending: true });
    
    if (!stores) return [];

    // Current hour seed for rotation
    const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60));

    // 2. For each store, fetch some representative scans/products
    // We'll fetch the latest 20 scans per store and pick one based on the hour
    const monitoringData = await Promise.all(stores.map(async (store) => {
      const { data: scans } = await supabase
        .from('scans')
        .select('product_name, price_captured, created_at, category')
        .eq('establishment_id', store.id)
        .eq('status', 'salvo')
        .is('user_id', null) // Public scans
        .order('created_at', { ascending: false })
        .limit(20);

      // Deterministic randomness based on store ID and hour
      const storeHash = store.id.split('-').reduce((acc, part) => acc + parseInt(part, 16), 0);
      const rotationIndex = (hourSeed + storeHash) % (scans?.length || 1);
      const currentScan = scans?.[rotationIndex];

      const status = Math.random() > 0.01 ? 'online' : 'offline'; // Mostly online
      
      // Mock insights based on real product if available
      const insights = [];
      if (currentScan) {
        insights.push({
          type: 'price',
          message: `Oferta: ${currentScan.product_name} por R$ ${currentScan.price_captured?.toFixed(2)}`,
          intensity: 'medium'
        });
        
        // Add a secondary insight
        const category = currentScan.category || 'Geral';
        insights.push({
          type: 'demand',
          message: `Alta procura na categoria ${category} hoje`,
          intensity: 'high'
        });
      } else {
        insights.push({
          type: 'stock',
          message: 'Aguardando novas atualizações de estoque',
          intensity: 'low'
        });
      }

      return {
        storeId: store.id,
        storeName: store.name,
        storeLogoUrl: store.logo_url,
        status,
        activeSensors: currentScan ? Math.floor((Math.sin(hourSeed + storeHash) + 1) * 5) + 3 : 0,
        lastSync: currentScan ? currentScan.created_at : new Date().toISOString(),
        insights: insights.slice(0, 2),
        currentProduct: currentScan ? {
          name: currentScan.product_name,
          price: currentScan.price_captured,
          category: currentScan.category
        } : null
      };
    }));

    return monitoringData;
  });
