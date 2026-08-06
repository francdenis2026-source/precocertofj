import { supabase } from "./src/integrations/supabase/client";

const establishmentId = 'eb1e6277-db89-4e94-950e-d14540ce71c6'; // DROGARIA PAGUE POUCO
const userId = '64e8e19e-4e44-486a-8d1a-464a9355f94d'; // System or Admin User

const productsToImport = [
  // Row 1
  { name: "Creme Dental Colgate Sensitive Pro Alívio Imediato Original 90g", price: 21.99, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Sensitive Pro Alívio Original 90g", price: 23.99, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Total 12 Original 90g", price: 16.99, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Total 12 Clean Mint 90g", price: 15.49, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Total 12 Whitening 90g", price: 15.49, category: "Higiene Pessoal" },
  // Row 2
  { name: "Creme Dental Colgate Total 12 Professional Gengiva Saudável 90g", price: 22.49, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Total 12 Professional Limpeza Profunda 90g", price: 15.49, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Sensitive Pro Alívio Branqueador 90g", price: 21.99, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Luminous White Carvão Ativado 140g", price: 21.49, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Luminous White Brilliant 70g", price: 9.99, category: "Higiene Pessoal" },
  // Row 3
  { name: "Creme Dental Colgate Máxima Proteção Anticáries 90g", price: 11.99, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Tripla Ação Menta 90g", price: 6.99, category: "Higiene Pessoal" },
  { name: "Creme Dental Colgate Tripla Ação Xtra White 90g", price: 13.99, category: "Higiene Pessoal" },
  { name: "Creme Dental Sorriso Dentes Brancos 90g", price: 4.99, category: "Higiene Pessoal" },
  { name: "Creme Dental Sorriso Tripla Ação 90g", price: 15.49, category: "Higiene Pessoal" }, // Price seems high for Sorriso 90g in the pic but I'll follow the tag near it
  // Bottom
  { name: "Creme Dental Super Kids", price: 4.00, category: "Higiene Pessoal" },
];

async function importProducts() {
  console.log(`Starting import for Pague Pouco (${establishmentId})...`);

  for (const item of productsToImport) {
    // 1. Find or Create in Catalog
    let { data: catalogItem, error: catalogError } = await supabase
      .from('product_catalog')
      .select('id')
      .ilike('display_name', item.name)
      .maybeSingle();

    if (catalogError) {
      console.error(`Error searching catalog for ${item.name}:`, catalogError);
      continue;
    }

    let productId;
    if (!catalogItem) {
      const { data: newItem, error: insertError } = await supabase
        .from('product_catalog')
        .insert({
          display_name: item.name,
          normalized_name: item.name.toLowerCase(),
          category: item.category,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error(`Error inserting into catalog ${item.name}:`, insertError);
        continue;
      }
      productId = newItem.id;
      console.log(`Created new catalog entry: ${item.name}`);
    } else {
      productId = catalogItem.id;
    }

    // 2. Insert Scan
    const { error: scanError } = await supabase
      .from('scans')
      .insert({
        establishment_id: establishmentId,
        product_name: item.name,
        price_captured: item.price,
        status: 'salvo',
        verdict: 'unknown',
        category: item.category,
        user_id: userId
      });

    if (scanError) {
      console.error(`Error inserting scan for ${item.name}:`, scanError);
    } else {
      console.log(`Imported ${item.name} at R$ ${item.price}`);
    }
  }

  console.log('Import finished.');
}

importProducts();
