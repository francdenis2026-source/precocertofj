
import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import fs from "fs";
import * as XLSX from "xlsx";

async function run() {
  const tables = ["establishments", "product_catalog", "scans", "profiles", "product_price_stats"];
  
  console.log("Iniciando exportação para Excel...");
  
  const workbook = XLSX.utils.book_new();

  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select("*");
      if (error) {
        console.error(`Erro ao buscar ${table}:`, error.message);
        continue;
      }
      
      if (data && data.length > 0) {
        // Formatar dados para garantir compatibilidade com Excel
        const formattedData = data.map(row => {
          const newRow: any = {};
          for (const key in row) {
            let val = row[key];
            if (val !== null && typeof val === 'object') {
              newRow[key] = JSON.stringify(val);
            } else {
              newRow[key] = val;
            }
          }
          return newRow;
        });

        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        XLSX.utils.book_append_sheet(workbook, worksheet, table.substring(0, 31)); // Limite de nome de aba no Excel
        console.log(`- Tabela ${table} adicionada ao Excel.`);
      }
    } catch (err: any) {
      console.error(`Erro na tabela ${table}:`, err.message);
    }
  }

  const filename = "PrecoCerto_Dados_Completos.xlsx";
  XLSX.writeFile(workbook, filename);
  console.log(`EXCEL_CREATED: ${filename}`);
}

run();
