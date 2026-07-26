import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyReceiptById } from "@/lib/receipts.functions";
import { getMyAccount } from "@/lib/account.functions";
import { ArrowLeft, Printer, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/comprovante/$id")({
  head: () => ({
    meta: [
      { title: "Comprovante de pagamento — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReceiptPage,
});

function fmtCurrency(n: number | null, currency = "BRL") {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ReceiptPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchReceipt = useServerFn(getMyReceiptById);
  const fetchAccount = useServerFn(getMyAccount);

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session ?? null,
    staleTime: 30_000,
  });
  const hasSession = !!sessionQuery.data;

  useEffect(() => {
    if (sessionQuery.isPending) return;
    if (!hasSession) navigate({ to: "/login", replace: true });
  }, [sessionQuery.isPending, hasSession, navigate]);

  const receiptQuery = useQuery({
    queryKey: ["receipt", id],
    queryFn: () => fetchReceipt({ data: { id } }),
    enabled: hasSession,
  });

  const accountQuery = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: hasSession,
  });

  const r = receiptQuery.data;
  const acc = accountQuery.data;

  if (receiptQuery.isPending || accountQuery.isPending) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14 text-center text-sm text-muted-foreground">
        Carregando comprovante…
      </div>
    );
  }

  if (!r) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-14 text-center">
        <h1 className="text-lg font-semibold text-foreground">Comprovante indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Este comprovante não foi encontrado ou pertence a outra conta.
        </p>
        <Link
          to="/assinatura"
          className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-muted/30 pb-16 print:bg-white">
      {/* Toolbar (hidden on print) */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/assinatura"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      <article className="mx-auto mt-6 max-w-3xl rounded-2xl border border-border bg-card p-8 shadow-sm print:mt-0 print:rounded-none print:border-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              PreçoCerto · Recibo
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground">
              Comprovante de pagamento
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Emitido em {fmtDateTime(new Date().toISOString())}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-savings/10 px-3 py-1 text-xs font-semibold text-savings">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pagamento aprovado
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              #{r.paymentId}
            </span>
          </div>
        </header>

        <section className="grid gap-4 border-b border-border py-6 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Cliente
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {acc?.fullName ?? r.payerName ?? "—"}
            </p>
            {acc?.cpf && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                CPF: {acc.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
              </p>
            )}
            {r.payerEmail && (
              <p className="mt-0.5 text-xs text-muted-foreground">{r.payerEmail}</p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Data do pagamento
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {fmtDateTime(r.paidAt)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Via Mercado Pago
            </p>
          </div>
        </section>

        <section className="border-b border-border py-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Item
          </p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-foreground">
                {r.planName ?? "Assinatura PreçoCerto"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.planDays} dias de acesso · acesso válido até{" "}
                <span className="font-semibold text-foreground">
                  {fmtDate(r.newPaidUntil)}
                </span>
              </p>
            </div>
            <p className="font-mono text-lg font-bold tabular-nums text-foreground">
              {fmtCurrency(r.amount, r.currency)}
            </p>
          </div>
        </section>

        <section className="flex items-center justify-between py-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Total pago
          </p>
          <p className="font-display text-2xl font-extrabold text-primary">
            {fmtCurrency(r.amount, r.currency)}
          </p>
        </section>

        <footer className="rounded-xl bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            Este documento é a confirmação eletrônica do pagamento processado pelo
            Mercado Pago. Não há renovação automática — o acesso é ativado pelo
            período contratado e expira na data indicada acima. Guarde este
            comprovante para seus registros.
          </p>
          <p className="mt-2">
            Identificador do pagamento: <span className="font-mono">{r.paymentId}</span>
          </p>
        </footer>
      </article>
    </div>
  );
}
