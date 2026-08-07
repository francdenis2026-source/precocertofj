import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/lib/require-admin";
import { z } from "zod";
import { analyzeProductImage } from "./vision.functions";

export const processPackImages = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((input: { images: string[]; establishmentId: string }) => ({
    images: z.array(z.string()).min(1).max(20).parse(input.images),
    establishmentId: z.string().uuid().parse(input.establishmentId),
  }))
  .handler(async ({ data, context }) => {
    const results = [];
    const { supabase } = context;

    // 1. Fetch establishment name for denormalization
    const { data: est } = await supabase
      .from("establishments")
      .select("name")
      .eq("id", data.establishmentId)
      .maybeSingle();
    const marketName = est?.name ?? null;

    for (const base64Image of data.images) {
      try {
        // 2. Extract data via OCR (Gemini 2.0 Flash via analyzeProductImage)
        const extraction = await analyzeProductImage({ data: { image: base64Image } });
        
        for (const product of extraction.products) {
          if (!product.productName || product.price === null) continue;

          const fullName = product.brand 
            ? `${product.productName} ${product.brand}`.replace(/\s+/g, " ").trim()
            : product.productName;

          // 3. Update/Insert Logic
          const { data: existing } = await supabase
            .from("scans")
            .select("id, price_captured")
            .eq("establishment_id", data.establishmentId)
            .eq("product_name", fullName)
            .maybeSingle();

          const status = "salvo" as "rascunho" | "salvo" | "arquivado" | "processado";
          const verdict = "unknown" as "unknown" | "high" | "low" | "medium";

          if (existing) {
            if (existing.price_captured !== product.price) {
              await supabase
                .from("scans")
                .update({ 
                  price_captured: product.price,
                  updated_at: new Date().toISOString(),
                  status
                })
                .eq("id", existing.id);
              results.push({ name: fullName, action: "updated", price: product.price });
            } else {
              results.push({ name: fullName, action: "skipped", price: product.price });
            }
          } else {
            await supabase
              .from("scans")
              .insert({
                product_name: fullName,
                price_captured: product.price,
                establishment_id: data.establishmentId,
                market_name: marketName,
                unit: product.unit,
                status,
                verdict,
                created_at: new Date().toISOString()
              });
            results.push({ name: fullName, action: "inserted", price: product.price });
          }
        }
      } catch (err) {
        console.error("Error processing image in pack:", err);
      }
    }

    // 4. Rebuild comparison cache
    if (results.some(r => r.action !== "skipped")) {
      await supabase.rpc("rebuild_comparison_cache_all");
    }

    return results;
  });
