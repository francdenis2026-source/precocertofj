import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const monitoringSchema = z.object({
  query: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(12),
});

export const getRealtimeMonitoringStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => monitoringSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { query, page, pageSize } = data;
    const cleanQuery = query?.trim().toLowerCase();

    // 1. Check permissions (Security: check if user has admin/moderator role)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    const isAdmin = roleData?.role === 'admin';
    const isModerator = roleData?.role === 'moderator';

    if (!isAdmin && !isModerator) {
      throw new Error("Acesso negado: Permissões insuficientes para visualizar o monitoramento.");
    }

    // 2. Performance: Fetch establishments with pagination
    const offset = (page - 1) * pageSize;
    
    let storesQuery = supabase
      .from('establishments')
      .select('id, name, logo_url', { count: 'exact' })
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);
      
    const { data: stores, count } = await storesQuery;
    
    if (!stores || stores.length === 0) return { stores: [], total: 0 };

    // 3. Batch fetch scans for the current page of stores
    const hourSeed = Math.floor(Date.now() / (1000 * 60 * 60));
    
    let scansQuery = supabase
      .from('scans')
      .select('establishment_id, product_name, price_captured, created_at, category')
      .in('establishment_id', stores.map(s => s.id))
      .eq('status', 'salvo')
      .is('user_id', null)
      .order('created_at', { ascending: false });

    if (cleanQuery) {
      scansQuery = scansQuery.ilike('product_name', `%${cleanQuery}%`);
    }

    const { data: allScans } = await scansQuery.limit(pageSize * 5);

    // Group scans
    const scansByStore = (allScans || []).reduce((acc: any, scan) => {
      if (!acc[scan.establishment_id]) acc[scan.establishment_id] = [];
      acc[scan.establishment_id].push(scan);
      return acc;
    }, {});

    const monitoringData = stores.map((store) => {
      const storeScans = scansByStore[store.id] || [];
      const storeHash = store.id.split('-').reduce((acc, part) => acc + (parseInt(part, 16) || 0), 0);
      const rotationIndex = (hourSeed + storeHash) % (storeScans.length || 1);
      const currentScan = storeScans[rotationIndex];

      return {
        storeId: store.id,
        storeName: store.name,
        storeLogoUrl: store.logo_url,
        status: 'online',
        lastSync: currentScan ? currentScan.created_at : new Date().toISOString(),
        insights: currentScan ? [{
          type: 'price',
          message: `${currentScan.product_name} • R$ ${currentScan.price_captured?.toFixed(2)}`,
          intensity: 'medium'
        }] : [{
          type: 'stock',
          message: 'Aguardando novas ofertas...',
          intensity: 'low'
        }]
      };
    });

    // 4. Audit: Log the monitoring access
    await supabase.from('monitoring_audit_logs').insert({
      user_id: userId,
      action: 'view_monitoring_dashboard',
      details: { page, query: cleanQuery }
    });

    return {
      stores: monitoringData,
      total: count || 0
    };
  });
