import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getCheckoutOrder,
  validatePromoCoupon,
  approveCheckoutOrder,
  setCheckoutEmail,
} from "@/lib/checkout.functions";
import {
  createMercadoPagoPreference,
  simulateCheckoutApproval,
  createPixCharge,
} from "@/lib/mercadopago.functions";
import { AppShell } from "@/components/brand/AppShell";
import { PageHeader } from "@/components/brand/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Ticket, Copy, CheckCircle2, ArrowRight, CreditCard, Loader2, ShieldAlert, Clock, Mail, AlertCircle, QrCode, RefreshCw } from "lucide-react";
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
  const simulate = useServerFn(simulateCheckoutApproval);
  const saveEmail = useServerFn(setCheckoutEmail);
  const createPix = useServerFn(createPixCharge);
  const { isAdmin } = useMyRoles();

  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

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

  // Hidrata o campo de e-mail com o valor já salvo no pedido, se houver.
  useEffect(() => {
    if (order?.delivery_email && !emailInput) {
      setEmailInput(order.delivery_email as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.delivery_email]);

  // Validação em tempo real do e-mail (mesma regex do server).
  const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const emailNormalized = emailInput.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(emailNormalized) && emailNormalized.length <= 254;
  const emailSaved =
    !!order?.delivery_email &&
    (order.delivery_email as string).toLowerCase() === emailNormalized;

  const saveEmailMutation = useMutation({
    mutationFn: () => saveEmail({ data: { id, email: emailNormalized } }),
    onSuccess: () => {
      toast.success("E-mail confirmado");
      qc.invalidateQueries({ queryKey: ["checkout-order", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível salvar o e-mail"),
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      // Garante o e-mail salvo antes de gerar a cobrança
      if (!emailValid) throw new Error("Informe um e-mail válido para receber o código.");
      if (!emailSaved) await saveEmail({ data: { id, email: emailNormalized } });
      return createPref({ data: { orderId: id } });
    },
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

  const simulateMutation = useMutation({
    mutationFn: () => simulate({ data: { orderId: id } }),
    onSuccess: (r) => {
      toast.success(`Pagamento simulado · código ${r?.licenseCode ?? "gerado"}`);
      qc.invalidateQueries({ queryKey: ["checkout-order", id] });
      if (r?.licenseCode) navigator.clipboard?.writeText(r.licenseCode).catch(() => {});
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao simular pagamento"),
  });

  const pixMutation = useMutation({
    mutationFn: async () => {
      if (!emailValid) throw new Error("Informe um e-mail válido para receber o código.");
      if (!emailSaved) await saveEmail({ data: { id, email: emailNormalized } });
      return createPix({ data: { orderId: id } });
    },
    onSuccess: () => {
      toast.success("PIX gerado — escaneie o QR Code ou copie o código.");
      qc.invalidateQueries({ queryKey: ["checkout-order", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar PIX"),
  });

  // Countdown para expiração do PIX (força re-render a cada segundo).
  const [tick, setTick] = useState(0);
  const pixExpiresAt: string | null = (order as any)?.pix_expires_at ?? null;
  const pixQrCode: string | null = (order as any)?.pix_qr_code ?? null;
  const pixQrBase64: string | null = (order as any)?.pix_qr_code_base64 ?? null;
  const pixMsLeft = pixExpiresAt ? new Date(pixExpiresAt).getTime() - Date.now() : 0;
  const pixActive = !!pixQrCode && pixMsLeft > 0;
  useEffect(() => {
    if (!pixActive) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [pixActive]);
  void tick;



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
        title="Finalizar assinatura"
        description={`Pedido #${String(order.id).slice(0, 8)} · pagamento pelo Mercado Pago`}
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
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4" /> E-mail para receber o código
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Enviamos o código de ativação assim que o pagamento for confirmado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Label htmlFor="delivery-email" className="text-xs font-medium">
                    Seu melhor e-mail
                  </Label>
                  <Input
                    id="delivery-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="voce@exemplo.com"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setEmailTouched(true);
                    }}
                    onBlur={() => {
                      setEmailTouched(true);
                      if (emailValid && !emailSaved && !saveEmailMutation.isPending) {
                        saveEmailMutation.mutate();
                      }
                    }}
                    aria-invalid={emailTouched && !emailValid}
                    className={
                      emailTouched && !emailValid
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  {emailTouched && emailInput.length > 0 && !emailValid && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" /> Digite um e-mail válido (ex.: nome@dominio.com).
                    </p>
                  )}
                  {emailValid && emailSaved && (
                    <p className="flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3 w-3" /> E-mail confirmado — o código será enviado para <strong className="ml-1">{emailNormalized}</strong>.
                    </p>
                  )}
                  {emailValid && !emailSaved && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => saveEmailMutation.mutate()}
                      disabled={saveEmailMutation.isPending}
                    >
                      {saveEmailMutation.isPending ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      Confirmar e-mail
                    </Button>
                  )}
                </CardContent>
              </Card>

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
                    disabled={payMutation.isPending || !emailValid}
                    title={!emailValid ? "Informe um e-mail válido antes de pagar" : undefined}
                  >
                    {payMutation.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-1 h-4 w-4" />
                    )}
                    Pagar com Mercado Pago
                  </Button>
                  {!emailValid && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertCircle className="h-3 w-3" />
                      Informe seu e-mail acima para liberar o pagamento.
                    </p>
                  )}
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
                  <CardContent className="space-y-2">
                    <Button
                      variant="gold"
                      className="w-full"
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? "Aprovando…" : "Aprovar e gerar código"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => simulateMutation.mutate()}
                      disabled={simulateMutation.isPending}
                      title="Aprova o pedido sem chamar o Mercado Pago (uso interno em dev)"
                    >
                      {simulateMutation.isPending ? "Simulando…" : "Simular pagamento (dev)"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      A simulação não passa pelo Mercado Pago — útil quando o token de teste ainda não está pronto.
                    </p>
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
