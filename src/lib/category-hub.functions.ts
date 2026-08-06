import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildCategoryHub, type CategoryHub } from "@/lib/category-hub.server";

export type { CategoryHub } from "@/lib/category-hub.server";

export const getCategoryHub = createServerFn({ method: "GET" })
  .validator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }): Promise<CategoryHub> => buildCategoryHub(data.slug));
