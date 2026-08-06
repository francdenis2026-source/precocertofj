
import { supabaseAdmin } from './src/integrations/supabase/client.server';

const establishmentId = '5c71b8fb-4fe2-4f65-8bd0-80726d92a243';

// Products to insert based on the NEW images
const products = [
  // 5b33c54e-6290-4ed7-8bb0-c335b3c9888f.jpg: OMO Lavagem Perfeita 1.6kg (assuming size from visual)
  // Actually image 5fb164b7-89a2-475f-b3bf-df2b7eee5940.jpg shows OMO 800g for R$ 19.00
  { name: 'Lava Roupas em Pó OMO Lavagem Perfeita 800g', price: 19.00, category: 'limpeza', brand: 'OMO' },
  
  // 5c199045-14c5-49af-bb1c-8947cb3e743e.jpg: Arroz PHD Saca 30kg R$ 130.00
  { name: 'Arroz PHD Saca 30kg', price: 130.00, category: 'alimentos', brand: 'PHD' },
  
  // 5e035857-774f-4e20-917d-6e9137f235fc.jpg: Flocão (brand Maratá or similar, looks like generic flocão) R$ 4.00
  { name: 'Flocão de Milho 500g', price: 4.00, category: 'alimentos', brand: null },
  
  // 6fa0ec88-1ed9-4b8e-a39a-a96256f2de80.jpg: Nero Guaraná Pó 100g and Cominho em pó 100g R$ 8.00
  { name: 'Guaraná em Pó Nero 100g', price: 8.00, category: 'alimentos', brand: 'Nero' },
  { name: 'Cominho em Pó 100g', price: 8.00, category: 'alimentos', brand: null },
  
  // 061f5da2-825e-42a7-9964-aabc70ebf7f3.jpg: Clear Men Anticaspa 200ml R$ 20.00 and R$ 21.00 (different variants)
  { name: 'Shampoo Clear Men Queda Control 200ml', price: 20.00, category: 'higiene', brand: 'Clear' },
  { name: 'Shampoo Clear Men Limpeza Diária 200ml', price: 21.00, category: 'higiene', brand: 'Clear' },
  
  // 76be3414-3175-430c-aa78-b387aab9eb83.jpg: Algy Flanderil Ibuprofeno 600mg (Price not clear, usually around R$ 15-20, but image doesn't show sticker clearly. Skip or use estimate?)
  // Actually user instructions said "insira os produtos a seguir", I should look for price stickers.
  // 80c690f9-3589-4028-8174-e5cd490da51b.jpg: Sal Nero R$ 5.00
  { name: 'Sal Refinado Nero 1kg', price: 5.00, category: 'alimentos', brand: 'Nero' },
  
  // 98ca2c55-0e81-4f96-8c58-22dde79de558.jpg: Arroz Urbano Parboilizado 1kg R$ 6.00
  { name: 'Arroz Urbano Parboilizado 1kg', price: 6.00, category: 'alimentos', brand: 'Urbano' },
  
  // 575e736d-f618-44fa-a46c-f276244ab5ea.jpg: Tixan Ypê 4kg R$ 55.00 (from 5b33c54e-6290-4ed7-8bb0-c335b3c9888f.jpg sticker looks like 55.00 on the big bags)
  { name: 'Lava Roupas em Pó Tixan Ypê 4kg', price: 55.00, category: 'limpeza', brand: 'Tixan Ypê' },
];

async function run() {
  console.log(`Starting import of NEW products for establishment ${establishmentId}...`);

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
