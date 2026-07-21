import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Composes requireSupabaseAuth and additionally verifies the caller
 * has the 'admin' role via public.has_role().
 *
 * Use this on EVERY server function that performs admin-scoped work
 * (managing subscribers, webhook logs, activation codes, roles, etc.).
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) {
      console.error("requireAdmin has_role error:", error);
      throw new Error("Forbidden: role check failed");
    }
    if (!data) {
      throw new Error("Forbidden: admin role required");
    }
    return next({ context });
  });
