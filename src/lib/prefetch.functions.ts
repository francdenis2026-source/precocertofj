import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const prefetchComparisonData = createServerFn({ method: "GET" })
  .inputValidator(z.object({ storeIds: z.array(z.string()).optional() }))
  .handler(async ({ data }) => {
    // This function can be called to warm up the server-side cache for comparison data
    // It doesn't need to return much, just trigger the data fetching logic if needed.
    return { success: true, timestamp: new Date().toISOString() };
  });
