
import { supabaseAdmin } from './src/integrations/supabase/client.server';

const establishmentId = '5c71b8fb-4fe2-4f65-8bd0-80726d92a243';

// Products to insert based on the Butcher Table (Açougue) image
const products = [
  // Red Table (Main Butcher List)
  { name: 'Filé Bovino', price: 50.00, category: 'acougues', brand: null },
  { name: 'Picanha', price: 50.00, category: 'acougues', brand: null },
  { name: 'Contra Filé', price: 40.00, category: 'acougues', brand: null },
  { name: 'Alcatra', price: 40.00, category: 'acougues', brand: null },
  { name: 'Coxão Mole', price: 38.00, category: 'acougues', brand: null },
  { name: 'Coxão Duro', price: 36.00, category: 'acougues', brand: null },
  { name: 'Patinho', price: 33.00, category: 'acougues', brand: null },
  { name: 'Carne Moída', price: 28.00, category: 'acougues', brand: null },
  { name: 'Fraldinha', price: 32.00, category: 'acougues', brand: null },
  { name: 'Músculo', price: 22.00, category: 'acougues', brand: null },
  { name: 'Costela Bovina', price: 22.00, category: 'acougues', brand: null },
  { name: 'Fígado Bovino', price: 18.00, category: 'acougues', brand: null },
  { name: 'Coração Bovino', price: 20.00, category: 'acougues', brand: null },
  { name: 'Bisteca Bovina', price: 30.00, category: 'acougues', brand: null },
  { name: 'Canela Bovina', price: 20.00, category: 'acougues', brand: null },
  { name: 'Pescoço Bovino', price: 18.00, category: 'acougues', brand: null },
  { name: 'Pé de Costela', price: 27.00, category: 'acougues', brand: null },
  { name: 'Rabo Bovino', price: 26.00, category: 'acougues', brand: null },
  { name: 'Pá com Osso', price: 27.00, category: 'acougues', brand: null },
  
  // Yellow Posters (Additional items and bulk prices)
  { name: 'Linguiça Aurora (Kg)', price: 32.00, category: 'acougues', brand: 'Aurora' },
  { name: 'Peito de Frango Aurora (Kg)', price: 19.00, category: 'acougues', brand: 'Aurora' },
  { name: 'Linguiça Toscana (Kg)', price: 30.00, category: 'acougues', brand: null },
  { name: 'Linguiça Calabresa (Kg)', price: 30.00, category: 'acougues', brand: null },
  { name: 'Galinha Inteira (Kg)', price: 15.00, category: 'acougues', brand: null },
  { name: 'Frango Nutriza (Kg)', price: 16.00, category: 'acougues', brand: 'Nutriza' },
  { name: 'Frango Seara (Kg)', price: 16.00, category: 'acougues', brand: 'Seara' },
  { name: 'Frango Sadia (Kg)', price: 19.00, category: 'acougues', brand: 'Sadia' },
  { name: 'Filé de Frango (Kg)', price: 19.00, category: 'acougues', brand: null },
  { name: 'Filé de Frango Saco', price: 25.00, category: 'acougues', brand: null },
  { name: 'Filé de Frango Bandeja', price: 28.00, category: 'acougues', brand: null },
  
  // Bulk Boxes (Caixa)
  { name: 'Caixa de Frango Sadia', price: 320.00, category: 'acougues', brand: 'Sadia' },
  { name: 'Caixa de Frango Nutriza', price: 300.00, category: 'acougues', brand: 'Nutriza' },
  { name: 'Caixa de Frango Seara', price: 290.00, category: 'acougues', brand: 'Seara' },
  
  // Hortifruti items from the side posters
  { name: 'Cebola (Kg)', price: 10.00, category: 'hortifruti', brand: null },
  { name: 'Cebola Roxa (Kg)', price: 14.00, category: 'hortifruti', brand: null },
  { name: 'Limão (Kg)', price: 12.00, category: 'hortifruti', brand: null },
  { name: 'Maçã (Kg)', price: 16.00, category: 'hortifruti', brand: null },
  { name: 'Beterraba (Kg)', price: 12.00, category: 'hortifruti', brand: null },
  { name: 'Cenoura (Kg)', price: 14.00, category: 'hortifruti', brand: null },
  { name: 'Batata (Kg)', price: 10.00, category: 'hortifruti', brand: null },
  { name: 'Batata Doce (Kg)', price: 7.00, category: 'hortifruti', brand: null },
  { name: 'Tomate (Kg)', price: 14.00, category: 'hortifruti', brand: null },
  { name: 'Melão (Kg)', price: 13.00, category: 'hortifruti', brand: null },
  { name: 'Repolho (Un)', price: 10.00, category: 'hortifruti', brand: null },
  { name: 'Abacate (Kg)', price: 12.00, category: 'hortifruti', brand: null },
  { name: 'Laranja (Kg)', price: 14.00, category: 'hortifruti', brand: null },
  { name: 'Mexerica (Kg)', price: 14.00, category: 'hortifruti', brand: null },
  { name: 'Alho (Kg)', price: 32.00, category: 'hortifruti', brand: null },
  { name: 'Manga (Kg)', price: 15.00, category: 'hortifruti', brand: null },
  { name: 'Maracujá (Kg)', price: 25.00, category: 'hortifruti', brand: null },
  { name: 'Polpa de Fruta (Kg)', price: 30.00, category: 'alimentos', brand: null },
];

async function run() {
  console.log(`Starting butcher and hortifruti import for establishment ${establishmentId}...`);

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
