import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const getRealtimeMonitoringStats = createServerFn({ method: "GET" })
  .inputValidator((d: any) => d as { query?: string })
  .handler(async ({ data }) => {
    const query = data?.query?.trim().toLowerCase();

    // 1. Fetch establishments
    const { data: stores } = await supabase
      .from('establishments')
      .select('id, name, logo_url')
      .order('name', { ascending: true });
    
    if (!stores || stores.length === 0) return [];

    // Current hour seed for rotation
    const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60));

    // 2. Fetch some scans for all these stores in a batch
    // We'll fetch the latest 5 scans per store to have a pool to rotate from
    // (Using a lateral join would be better but for now let's just fetch recent public scans)
    let scansQuery = supabase
      .from('scans')
      .select('establishment_id, product_name, price_captured, created_at, category')
      .in('establishment_id', stores.map(s => s.id))
      .eq('status', 'salvo')
      .is('user_id', null)
      .order('created_at', { ascending: false });

    if (query) {
      scansQuery = scansQuery.ilike('product_name', `%${query}%`);
    }

    const { data: allScans } = await scansQuery.limit(150);


    // Group scans by establishment
    const scansByStore = (allScans || []).reduce((acc: any, scan) => {
      if (!acc[scan.establishment_id]) acc[scan.establishment_id] = [];
      acc[scan.establishment_id].push(scan);
      return acc;
    }, {});

    const monitoringData = stores.map((store) => {
      const storeScans = scansByStore[store.id] || [];
      
      // Deterministic randomness based on store ID and hour
      const storeHash = store.id.split('-').reduce((acc, part) => acc + parseInt(part, 16) || 0, 0);
      const rotationIndex = (hourSeed + storeHash) % (storeScans.length || 1);
      const currentScan = storeScans[rotationIndex];

      const status = 'online'; // Most are online for the live panel
      
      const insights = [];
      if (currentScan) {
        insights.push({
          type: 'price',
          message: `Destaque: ${currentScan.product_name} por R$ ${currentScan.price_captured?.toFixed(2)}`,
          intensity: 'medium'
        });
        
        const category = currentScan.category || 'Geral';
        insights.push({
          type: 'demand',
          message: `Alta procura na categoria ${category} hoje`,
          intensity: 'high'
        });
      } else {
        insights.push({
          type: 'stock',
          message: 'Verificando novas atualizações de preços...',
          intensity: 'low'
        });
      }

      return {
        storeId: store.id,
        storeName: store.name,
        storeLogoUrl: store.logo_url,
        status,
        activeSensors: currentScan ? Math.floor((Math.abs(Math.sin(hourSeed + storeHash)) * 5)) + 3 : 0,
        lastSync: currentScan ? currentScan.created_at : new Date().toISOString(),
        insights: insights.slice(0, 2)
      };
    });

    return monitoringData;
  });
