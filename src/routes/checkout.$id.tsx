import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getCheckoutOrder,
  validatePromoCoupon,
  approveCheckoutOrder,
} from "@/lib/checkout.functions";
import { createMercadoPagoPreference } from "@/lib/mercadopago.functions";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Ticket, Copy, CheckCircle2, ArrowRight, CreditCard, Loader2, ShieldAlert, Clock } from "lucide-react";
import { toast } from "sonner";
import { useMyRoles } from "@/hooks/useMyRoles";

export const Route = createFileRoute("/checkout/$id")({
  head: () => ({
    meta: [
      { title: "Checkout — PreçoCerto" },
      { name: "description", content: "Revise seu pedido e conclua a compra do seu plano PreçoCerto." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CheckoutPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOrder = useServerFn(getCheckoutOrder);
  const validate = useServerFn(validatePromoCoupon);
  const approve = useServerFn(approveCheckoutOrder);
  const createPref = useServerFn(createMercadoPagoPreference);
  const { isAdmin } = useMyRoles();

  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login", search: { next: `/checkout/${id}` } as any });
    });
  }, [id, navigate]);

  // Show a toast if user came back from MP
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("status");
    if (status === "success") toast.success("Pagamento aprovado! Gerando seu código…");
    else if (status === "pending") toast.info("Pagamento pendente. Assim que o MP confirmar, seu código aparece aqui.");
    else if (status === "failure") toast.error("Pagamento não concluído. Tente novamente.");
  }, []);

  const { data: order, isLoading } = useQuery({
    queryKey: ["checkout-order", id],
    queryFn: () => fetchOrder({ data: { id } }),
    refetchInterval: (q) => (q.state.data?.status === "pending" ? 4000 : false),
  });

  const payMutation = useMutation({
    mutationFn: () => createPref({ data: { orderId: id } }),
    onSuccess: (r) => {
      if (r?.url) window.location.href = r.url;
      else toast.error("URL do Mercado Pago não retornada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao iniciar pagamento"),
  });

  const approveMutation = useMutation({
    mutationFn: () => approve({ data: { id, providerRef: "manual-admin" } }),
    onSuccess: (r) => {
      toast.success("Pedido aprovado — código gerado");
      qc.invalidateQueries({ queryKey: ["checkout-order", id] });
      if (r?.licenseCode) navigator.clipboard?.writeText(r.licenseCode).catch(() => {});
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao aprovar"),
  });

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setApplying(true);
    try {
      const r = await validate({ data: { code: couponInput.trim() } });
      if (!r.valid) {
        toast.error("Cupom inválido ou inativo");
        return;
      }
      toast.success(`Cupom aplicado: ${r.percent_off}% off`);
      // Refresh page hint: currently coupon is set at order creation; suggest recreate
      toast.info("O cupom deve ser aplicado antes de gerar o pedido. Volte a /planos.");
    } finally {
      setApplying(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl p-6">
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-40 animate-pulse rounded-lg bg-muted" />
        </div>
      </AppShell>
    );
  }

  if (!order) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2">Pedido não encontrado.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/planos">Ver planos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const isApproved = order.status === "approved";
  const licenseCode: string | undefined = order.license_codes?.code;
  const planName: string = order.license_plans?.name ?? "Plano";

  return (
    <AppShell>
      <PageHeader
        title="Checkout"
        description={`Pedido #${String(order.id).slice(0, 8)}`}
        breadcrumbs={[{ label: "Planos", to: "/planos" }, { label: "Checkout" }]}
      />
      <div className="mx-auto grid max-w-4xl gap-4 p-4 md:grid-cols-[1fr_360px]">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{planName}</CardTitle>
            <CardDescription>Revise seu pedido antes de pagar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Preço do plano" value={centsToBRL(order.original_cents)} />
            {order.discount_cents > 0 && (
              <Row
                label={`Desconto${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
                value={`- ${centsToBRL(order.discount_cents)}`}
                tone="discount"
              />
            )}
            <div className="border-t border-border/60 pt-3">
              <Row label="Total" value={centsToBRL(order.final_cents)} strong />
            </div>
            <div className="pt-2">
              <Badge variant={isApproved ? "default" : "outline"}>
                {isApproved ? "Pagamento aprovado" : order.status === "pending" ? "Aguardando pagamento" : order.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Action */}
        <div className="space-y-3">
          {isApproved && licenseCode ? (
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Seu código está pronto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-center">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Código de licença</div>
                  <div className="mt-1 font-mono text-lg">{licenseCode}</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(licenseCode);
                      toast.success("Copiado");
                    }}
                  >
                    <Copy className="mr-1 h-4 w-4" /> Copiar
                  </Button>
                  <Button asChild variant="executive" className="flex-1">
                    <Link to="/resgatar">Ativar <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
                <Button asChild variant="ghost-navy" size="sm" className="w-full">
                  <Link to="/minhas-licencas">Ver minhas licenças</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Pagamento</CardTitle>
                  <CardDescription className="text-xs">
                    Você será redirecionado ao Mercado Pago para concluir com Pix, cartão ou boleto.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full"
                    variant="executive"
                    onClick={() => payMutation.mutate()}
                    disabled={payMutation.isPending}
                  >
                    {payMutation.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-1 h-4 w-4" />
                    )}
                    Pagar com Mercado Pago
                  </Button>
                  {order.status === "pending" && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      A confirmação chega automaticamente após o pagamento.
                    </p>
                  )}
                </CardContent>
              </Card>


              {order.discount_cents === 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Ticket className="h-4 w-4" /> Cupom promocional
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Input
                      placeholder="Ex.: FEIJO20"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={applyCoupon}
                      disabled={applying || !couponInput.trim()}
                    >
                      {applying ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                      Validar cupom
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Cupons devem ser aplicados no início — volte à página de planos para gerar um novo pedido com desconto.
                    </p>
                  </CardContent>
                </Card>
              )}

              {isAdmin && (
                <Card className="border-[hsl(var(--gold))]/40">
                  <CardHeader>
                    <CardTitle className="text-sm">Admin · Aprovação manual</CardTitle>
                    <CardDescription className="text-xs">
                      Marca este pedido como pago e gera o código de licença agora.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="gold"
                      className="w-full"
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? "Aprovando…" : "Aprovar e gerar código"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "discount";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`${strong ? "text-lg font-serif" : ""} ${
          tone === "discount" ? "text-primary" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
