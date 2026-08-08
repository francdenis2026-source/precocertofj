import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Collaboration system for points and credits.
 * This file is a thin wrapper around server-side logic.
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
    email: string,
    marketName?: string,
    cityName?: string,
    attachmentPaths?: string[],
    source?: string
  }) => z.object({
    email: z.string().email(),
    marketName: z.string().optional(),
    cityName: z.string().optional(),
    attachmentPaths: z.array(z.string()).optional(),
    source: z.string().optional()
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { data: submission, error } = await supabaseAdmin
      .from("collaborator_submissions")
      .insert({
        user_id: context.userId,
        email: data.email,
        market_name: data.marketName ?? null,
        city: data.cityName ?? null,
        attachment_paths: data.attachmentPaths ?? [],
        source: data.source ?? "app_contribution",
        status: "pending"
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
    status: string,
    points?: number,
    notes?: string
  }) => z.object({
    id: z.string(),
    status: z.string(),
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
    
    if (fetchErr || !sub || sub.status !== "pending") {
      throw new Error("Contribuição já processada ou inválida");
    }

    const userId = sub.user_id;

    // Start update
    const { error: updateErr } = await supabaseAdmin
      .from("collaborator_submissions")
      .update({
        status: data.status,
        points_awarded: data.points ?? 0,
        admin_notes: data.notes ?? null,
        processed_at: new Date().toISOString(),
        processed_by: context.userId
      })
      .eq("id", data.id);
    
    if (updateErr) throw new Error(updateErr.message);

    // If points awarded, update wallet and transactions
    if (data.points && data.points > 0 && userId && (data.status === "approved" || data.status === "partially_approved")) {
      // Log transaction
      await supabaseAdmin.from("credit_transactions").insert({
        user_id: userId,
        type: "reward",
        amount: data.points,
        description: `Recompensa por colaboração (${data.id})`
      });

      // Update wallet balance
      const { data: wallet } = await supabaseAdmin
        .from("user_wallets")
        .select("balance, total_earned")
        .eq("user_id", userId)
        .single();
      
      await supabaseAdmin
        .from("user_wallets")
        .update({
          balance: (wallet?.balance || 0) + data.points,
          total_earned: (wallet?.total_earned || 0) + data.points,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);
    }

    return { success: true };
  });
