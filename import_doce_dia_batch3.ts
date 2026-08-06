
import { supabaseAdmin } from './src/integrations/supabase/client.server';

const establishmentId = '5c71b8fb-4fe2-4f65-8bd0-80726d92a243';

// Products to insert based on the THIRD batch of images
const products = [
  // user-uploads://bb81369e-a425-464f-bde4-0282b24f382c.jpg: OMO Puro Cuidado 1.6kg R$ 37.00, OMO Lavanda 1.6kg R$ 37.00
  { name: 'Lava Roupas em Pó OMO Puro Cuidado 1.6kg', price: 37.00, category: 'limpeza', brand: 'OMO' },
  { name: 'Lava Roupas em Pó OMO Lavanda 1.6kg', price: 37.00, category: 'limpeza', brand: 'OMO' },
  
  // user-uploads://c6efcc52-7a07-402e-82fa-f77b009a89e2.jpg: OMO Roupas Finas & Delicadas 1L (Liquido) R$ 16.00
  { name: 'Lava Roupas Líquido OMO Roupas Finas & Delicadas 1L', price: 16.00, category: 'limpeza', brand: 'OMO' },
  
  // user-uploads://c48b3bda-1dd3-4f23-b63a-050504c59cf3.jpg: Minuano Concentrado 1.6kg R$ 23.00 (looks like a repeat, but I'll ensure it's recorded)
  { name: 'Lava Roupas Minuano Máxima Perfumação 1.6kg', price: 23.00, category: 'limpeza', brand: 'Minuano' },
  
  // user-uploads://cfa87107-cbc2-46b8-95d3-545a8fd4e433.jpg: Absorvente Intimus Noite Longo com Abas R$ 20.00
  { name: 'Absorvente Intimus Noite & Dia Longo com Abas', price: 20.00, category: 'higiene', brand: 'Intimus' },
  
  // user-uploads://e856586a-94da-45f0-8bcd-4f390080b3c8.jpg: Sabão em Barra Ypê Glicerinado 900g (5 unidades) R$ 20.00
  { name: 'Sabão em Barra Ypê Glicerinado 900g (Pack 5)', price: 20.00, category: 'limpeza', brand: 'Ypê' },

  // user-uploads://ff3e4a66-f4ac-492a-bd64-954fa1e1a209.jpg: NEW Items from the Butcher table and side notes
  { name: 'Fígado Bovino', price: 18.00, category: 'acougues', brand: null },
  { name: 'Coração Bovino (Inteiro)', price: 20.00, category: 'acougues', brand: null },
  { name: 'Canela Bovina', price: 20.00, category: 'acougues', brand: null },
  { name: 'Pescoço Bovino', price: 18.00, category: 'acougues', brand: null },
  { name: 'Frango Nutriza (Kg)', price: 16.00, category: 'acougues', brand: 'Nutriza' },
  { name: 'Frango Seara (Kg)', price: 16.00, category: 'acougues', brand: 'Seara' },
  { name: 'Frango Sadia (Kg)', price: 19.00, category: 'acougues', brand: 'Sadia' },
  { name: 'Filé de Frango (Kg)', price: 19.00, category: 'acougues', brand: null },
  { name: 'Filé de Frango (Saco)', price: 25.00, category: 'acougues', brand: null },
  { name: 'Filé de Frango (Bandeja)', price: 28.00, category: 'acougues', brand: null },
  { name: 'Cebola (Kg)', price: 10.00, category: 'hortifruti', brand: null },
  { name: 'Limão (Kg)', price: 12.00, category: 'hortifruti', brand: null },
  { name: 'Maçã (Kg)', price: 16.00, category: 'hortifruti', brand: null },
  { name: 'Batata (Kg)', price: 10.00, category: 'hortifruti', brand: null },
  { name: 'Tomate (Kg)', price: 14.00, category: 'hortifruti', brand: null },
  { name: 'Melão (Kg)', price: 13.00, category: 'hortifruti', brand: null },
  { name: 'Laranja (Kg)', price: 14.00, category: 'hortifruti', brand: null },
  { name: 'Alho (Kg)', price: 32.00, category: 'hortifruti', brand: null },
  { name: 'Batata Doce (Kg)', price: 7.00, category: 'hortifruti', brand: null },
];

async function run() {
  console.log(`Starting third batch import for establishment ${establishmentId}...`);

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
