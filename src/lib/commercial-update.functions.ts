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

    const { data: est } = await supabase
      .from("establishments")
      .select("name")
      .eq("id", data.establishmentId)
      .maybeSingle();
    const marketName = est?.name ?? null;

    for (const base64Image of data.images) {
      try {
        const extraction = await analyzeProductImage({ data: { image: base64Image } });
        
        for (const product of extraction.products) {
          if (!product.productName || product.price === null) continue;

          const fullName = product.brand 
            ? `${product.productName} ${product.brand}`.replace(/\s+/g, " ").trim()
            : product.productName;

          const { data: existing } = await supabase
            .from("scans")
            .select("id, price_captured")
            .eq("establishment_id", data.establishmentId)
            .eq("product_name", fullName)
            .maybeSingle();

          const status = "salvo";
          const verdict = "unknown";

          if (existing) {
            if (existing.price_captured !== product.price) {
              await supabase
                .from("scans")
                .update({ 
                  price_captured: product.price,
                  updated_at: new Date().toISOString(),
                  status
                } as any)
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
              } as any);
            results.push({ name: fullName, action: "inserted", price: product.price });
          }
        }
      } catch (err) {
        console.error("Error processing image in pack:", err);
      }
    }

    if (results.some(r => r.action !== "skipped")) {
      await supabase.rpc("rebuild_comparison_cache_all");
    }

    return results;
  });
