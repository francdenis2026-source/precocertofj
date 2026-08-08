
import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import fs from "fs";
import { execSync } from "child_process";
import { createHash } from "crypto";

async function exportTable(tableName: string) {
  try {
    const { data, error } = await supabaseAdmin.from(tableName).select("*");
    if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        return null;
    }
    if (!data || data.length === 0) return null;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(header => {
        let val = row[header];
        if (val === null) return "";
        if (typeof val === "object") val = JSON.stringify(val);
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(","))
    ].join("\n");
    
    const filename = `${tableName}.csv`;
    fs.writeFileSync(filename, csvContent);
    return filename;
  } catch (err: any) {
    console.error(`Error exporting ${tableName}:`, err.message);
    return null;
  }
}

async function run() {
  const tables = ["establishments", "products", "scans", "profiles", "product_catalog", "catalog_suggestions", "product_price_stats", "user_wallets", "subscriptions"];
  const files: string[] = [];
  
  console.log("Iniciando exportação de dados...");
  
  for (const table of tables) {
    const file = await exportTable(table);
    if (file) {
      console.log(`- Tabela ${table} exportada.`);
      files.push(file);
    }
  }
  
  if (files.length > 0) {
    const zipName = "Dados_PrecoCerto_Full.zip";
    
    // Create ZIP
    execSync(`zip -j ${zipName} ${files.join(" ")}`);
    
    // Generate Checksum for integrity verification
    const fileBuffer = fs.readFileSync(zipName);
    const hashSum = createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    
    fs.writeFileSync("checksum.txt", `SHA256: ${hex}\nArquivo: ${zipName}\nData: ${new Date().toISOString()}`);
    
    console.log(`CREATED_ZIP: ${zipName}`);
    console.log(`CHECKSUM: ${hex}`);
    
    files.forEach(f => fs.unlinkSync(f));
  } else {
    console.log("Nenhum dado encontrado para exportar.");
  }
}

run();
