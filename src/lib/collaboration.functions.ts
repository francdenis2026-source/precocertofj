import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Collaboration system for points and credits.
 */
export const getMyContributions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("collaborator_submissions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const submitContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { 
    type: "receipt" | "price_info" | "photo", 
    payload: any,
    establishmentId?: string 
  }) => z.object({
    type: z.enum(["receipt", "price_info", "photo"]),
    payload: z.any(),
    establishmentId: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: submission, error } = await supabaseAdmin
      .from("collaborator_submissions")
      .insert({
        user_id: context.userId,
        status: "pending",
        establishment_id: data.establishmentId,
        payload: data.payload,
        type: data.type
      })
      .select("id")
      .single();
    
    if (error) throw new Error(error.message);
    return { id: submission.id, status: "pending" };
  });

/**
 * Admin: Review contribution
 */
export const reviewContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { 
    id: string, 
    status: "approved" | "partially_approved" | "rejected" | "suspected_fraud",
    points?: number,
    notes?: string
  }) => z.object({
    id: z.string(),
    status: z.enum(["approved", "partially_approved", "rejected", "suspected_fraud"]),
    points: z.number().optional(),
    notes: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Security check
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Acesso negado");

    const { data: sub, error: fetchErr } = await supabaseAdmin
      .from("collaborator_submissions")
      .select("user_id, status")
      .eq("id", data.id)
      .single();
    
    if (fetchErr || sub.status !== "pending") throw new Error("Contribuição já processada ou inválida");

    // Start transaction-like process
    const { error: updateErr } = await supabaseAdmin
      .from("collaborator_submissions")
      .update({
        status: data.status,
        points_awarded: data.points || 0,
        admin_notes: data.notes,
        processed_at: new Date().toISOString(),
        processed_by: context.userId
      })
      .eq("id", data.id);
    
    if (updateErr) throw new Error(updateErr.message);

    // If points awarded, update wallet and transactions
    if (data.points && data.points > 0 && (data.status === "approved" || data.status === "partially_approved")) {
      // Log transaction
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: sub.user_id,
        type: "reward",
        amount: data.points,
        description: `Recompensa por colaboração (${data.id})`,
        reference_id: data.id
      });

      // Update wallet balance (using RPC for safety if available, or manual update)
      // For now, simple update (wallet is 1:1 user_id)
      const { data: wallet } = await supabaseAdmin
        .from("user_wallets")
        .select("balance, total_earned")
        .eq("user_id", sub.user_id)
        .single();
      
      await supabaseAdmin
        .from("user_wallets")
        .update({
          balance: (wallet?.balance || 0) + data.points,
          total_earned: (wallet?.total_earned || 0) + data.points,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", sub.user_id);
    }

    return { success: true };
  });
