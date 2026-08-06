
import { supabaseAdmin } from './src/integrations/supabase/client.server';
import fs from 'fs';

const establishmentId = '5c71b8fb-4fe2-4f65-8bd0-80726d92a243';

// Products to insert based on the images
const products = [
  { name: 'Detergente Vida Neutro 500ml', price: 3.00, category: 'limpeza', brand: 'Vida' },
  { name: 'Detergente Vida Limão 500ml', price: 3.00, category: 'limpeza', brand: 'Vida' },
  { name: 'Kit Dabelle Liso Arrasador (Shampoo 250ml + Condicionador 175ml)', price: 27.00, category: 'higiene', brand: 'Dabelle' },
  { name: 'Kit Dabelle Abacate Nutritivo (Shampoo + Condicionador)', price: 27.00, category: 'higiene', brand: 'Dabelle' },
  { name: 'Água Sanitária Ypê 2L', price: 6.00, category: 'limpeza', brand: 'Ypê' }, // Assuming 2L based on common Ype bottle size in images
  { name: 'Kit Elseve Hidra Hialurônico (Shampoo + Condicionador)', price: 36.00, category: 'higiene', brand: 'Elseve' },
  { name: 'Açúcar Itamarati 1kg', price: 4.00, category: 'alimentos', brand: 'Itamarati' },
  { name: 'Detergente Ypê Neutro 500ml', price: 3.50, category: 'limpeza', brand: 'Ypê' },
  { name: 'Lava Roupas Minuano Concentrado 1,6kg', price: 23.00, category: 'limpeza', brand: 'Minuano' },
  { name: 'Biscoito Itamarati Recheado', price: 2.00, category: 'alimentos', brand: 'Itamarati' },
  // Meat table from image 5a624186-b416-4730-82e4-d82d02863a8f.jpg
  { name: 'Filé Bovino', price: 50.00, category: 'acougues', brand: null },
  { name: 'Picanha', price: 50.00, category: 'acougues', brand: null },
  { name: 'Contra Filé', price: 40.00, category: 'acougues', brand: null },
  { name: 'Alcatra', price: 40.00, category: 'acougues', brand: null },
  { name: 'Coxão Mole', price: 33.00, category: 'acougues', brand: null },
  { name: 'Coxão Duro', price: 36.00, category: 'acougues', brand: null },
  { name: 'Patinho', price: 33.50, category: 'acougues', brand: null },
  { name: 'Carne Moída', price: 32.00, category: 'acougues', brand: null },
  { name: 'Fraldinha', price: 32.00, category: 'acougues', brand: null },
  { name: 'Costela Bovina', price: 22.00, category: 'acougues', brand: null },
  { name: 'Músculo', price: 22.00, category: 'acougues', brand: null },
  { name: 'Coração Bovino', price: 20.00, category: 'acougues', brand: null },
  { name: 'Bisteca', price: 20.00, category: 'acougues', brand: null },
  { name: 'Pé de Costela', price: 27.00, category: 'acougues', brand: null },
  { name: 'Rabo', price: 26.00, category: 'acougues', brand: null },
  { name: 'Pá com Osso', price: 27.00, category: 'acougues', brand: null },
];

async function run() {
  console.log(`Starting import for establishment ${establishmentId}...`);

  for (const p of products) {
    const normalizedName = p.name.toLowerCase().trim();
    
    // 1. Check/Insert into product_catalog
    let { data: catalogItem, error: catalogError } = await supabaseAdmin
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
