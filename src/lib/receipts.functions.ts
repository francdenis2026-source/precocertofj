/**
 * Comprovantes de pagamento do usuário logado.
 * Alimentado pelo webhook do Mercado Pago em `payment_receipts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PaymentReceipt = {
  id: string;
  paymentId: string;
  planId: string | null;
  planName: string | null;
  planDays: number;
  amount: number | null;
  currency: string;
  status: string;
  paidAt: string;
  newPaidUntil: string | null;
  payerEmail: string | null;
  payerName: string | null;
};

type Row = {
  id: string;
  payment_id: string;
  plan_id: string | null;
  plan_name: string | null;
  plan_days: number;
  amount: number | string | null;
  currency: string;
  status: string;
  paid_at: string;
  new_paid_until: string | null;
  payer_email: string | null;
  payer_name: string | null;
};

function toView(r: Row): PaymentReceipt {
  return {
    id: r.id,
    paymentId: r.payment_id,
    planId: r.plan_id,
    planName: r.plan_name,
    planDays: r.plan_days,
    amount: r.amount == null ? null : Number(r.amount),
    currency: r.currency,
    status: r.status,
    paidAt: r.paid_at,
    newPaidUntil: r.new_paid_until,
    payerEmail: r.payer_email,
    payerName: r.payer_name,
  };
}

export const listMyReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentReceipt[]> => {
    const { data, error } = await context.supabase
      .from("payment_receipts" as never)
      .select(
        "id, payment_id, plan_id, plan_name, plan_days, amount, currency, status, paid_at, new_paid_until, payer_email, payer_name",
      )
      .eq("profile_id", context.userId)
      .order("paid_at", { ascending: false })
      .limit(24);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as Row[]).map(toView);
  });

export const getMyReceiptById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string }) => {
    const id = String(data?.id ?? "").trim();
    if (!id) throw new Error("id obrigatório");
    return { id };
  })
  .handler(async ({ context, data }): Promise<PaymentReceipt | null> => {
    const { data: row, error } = await context.supabase
      .from("payment_receipts" as never)
      .select(
        "id, payment_id, plan_id, plan_name, plan_days, amount, currency, status, paid_at, new_paid_until, payer_email, payer_name",
      )
      .eq("profile_id", context.userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return toView(row as unknown as Row);
  });
