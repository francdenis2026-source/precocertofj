
import { supabaseAdmin } from './src/integrations/supabase/client.server';

const establishmentId = '5c71b8fb-4fe2-4f65-8bd0-80726d92a243';

// Products to insert based on the NEW images provided in the second batch
const products = [
  // user-uploads://8910e1ac-b7c5-4cb4-b04f-616b132b6292.jpg: Açúcar Itamarati Saca (looks like a bundle) R$ 100.00
  { name: 'Açúcar Itamarati Saca (Fardo)', price: 100.00, category: 'alimentos', brand: 'Itamarati' },
  
  // user-uploads://15082db6-3d1c-4b28-bede-80c3e65225eb.jpg: Macarrão Araguaia 400g R$ 3.00, Macarrão Liane 400g R$ 3.00
  { name: 'Macarrão Araguaia Espaguete 400g', price: 3.00, category: 'alimentos', brand: 'Araguaia' },
  { name: 'Macarrão Liane Espaguete 400g', price: 3.00, category: 'alimentos', brand: 'Liane' },
  
  // user-uploads://746298e3-9e14-4975-8e60-65bc8c2eef45.jpg: Clear Men Anticaspa 400ml (Controle Coceira / Limpeza Diária) R$ 33.00
  { name: 'Shampoo Clear Men Queda Control 400ml', price: 33.00, category: 'higiene', brand: 'Clear' },
  { name: 'Shampoo Clear Men Limpeza Diária 400ml', price: 33.00, category: 'higiene', brand: 'Clear' },
  
  // user-uploads://4486761b-cfd8-44e0-ae46-50e6f0226283.jpg: Tempero Nero Alho e Sal 1kg R$ 13.00
  { name: 'Tempero Nero Alho e Sal 1kg', price: 13.00, category: 'alimentos', brand: 'Nero' },
  
  // user-uploads://6731664b-41a8-4894-a13d-a9cd74653611.jpg: Arroz Kumbuca 30kg R$ 135.00, Arroz Urbano Branco 30kg R$ 160.00
  { name: 'Arroz Kumbuca Saca 30kg', price: 135.00, category: 'alimentos', brand: 'Kumbuca' },
  { name: 'Arroz Urbano Branco Saca 30kg', price: 160.00, category: 'alimentos', brand: 'Urbano' },
  
  // user-uploads://a1c0393c-b19e-484a-ab29-3bafbcf49da7.jpg: Biscoito Cream Cracker Liane R$ 6.00
  { name: 'Biscoito Cream Cracker Liane', price: 6.00, category: 'alimentos', brand: 'Liane' },
  
  // user-uploads://a2a10426-a8a7-41be-9da4-ad3ca5d17ed4.jpg: Tixan Ypê 400g R$ 8.00
  { name: 'Lava Roupas em Pó Tixan Ypê 400g', price: 8.00, category: 'limpeza', brand: 'Tixan Ypê' },
  
  // user-uploads://a2e7452d-6d6a-4e23-801c-c2ba43160533.jpg: Sal Nero 1kg R$ 4.00
  { name: 'Sal Refinado Nero 1kg (Econômico)', price: 4.00, category: 'alimentos', brand: 'Nero' },
  
  // user-uploads://ba0de69b-c2ab-4f41-822b-05cfec5b3b37.jpg: OMO Lavagem Perfeita 1.6kg R$ 37.00
  { name: 'Lava Roupas em Pó OMO Lavagem Perfeita 1.6kg', price: 37.00, category: 'limpeza', brand: 'OMO' },
];

async function run() {
  console.log(`Starting second batch import for establishment ${establishmentId}...`);

  for (const p of products) {
    const normalizedName = p.name.toLowerCase().trim();
    
    // 1. Check/Insert into product_catalog
    let { data: catalogItem } = await supabaseAdmin
      .from('product_catalog')
      .select('id')
      .eq('normalized_name', normalizedName)
      .single();

    if (!catalogItem) {
      console.log(`Inserting catalog item: ${p.name}`);
      const { data: newCatalog, error: insertError } = await supabaseAdmin
        .from('product_catalog')
        .insert({
          display_name: p.name,
          normalized_name: normalizedName,
          category: p.category,
          brand: p.brand
        })
        .select()
        .single();
      
      if (insertError) {
        console.error(`Error inserting catalog item ${p.name}:`, insertError);
        continue;
      }
      catalogItem = newCatalog;
    }

    // 2. Insert into scans
    console.log(`Recording scan/price for ${p.name}: R$ ${p.price}`);
    const { error: scanError } = await supabaseAdmin
      .from('scans')
      .insert({
        establishment_id: establishmentId,
        product_name: p.name,
        price_captured: p.price,
        category: p.category,
        verdict: 'unknown',
        status: 'salvo',
        verified: true,
        verified_at: new Date().toISOString()
      });

    if (scanError) {
      console.error(`Error inserting scan for ${p.name}:`, scanError);
    }
    
    // 3. Insert into product_price_history
    const { error: historyError } = await supabaseAdmin
      .from('product_price_history')
      .insert({
        establishment_id: establishmentId,
        product_name: p.name,
        price: p.price,
        product_key: normalizedName,
        source: 'manual_import',
        brand: p.brand
      });
      
    if (historyError) {
      console.error(`Error inserting history for ${p.name}:`, historyError);
    }
  }

  console.log('Import finished.');
}

run().catch(console.error);
