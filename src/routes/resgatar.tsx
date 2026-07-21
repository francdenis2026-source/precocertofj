import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { redeemMyLicenseCode } from "@/lib/licenses.functions";
import { getMyAccount } from "@/lib/account.functions";
import { Loader2, Ticket, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/resgatar")({
  head: () => ({
    meta: [
      { title: "Resgatar código promocional — PreçoCerto" },
      {
        name: "description",
        content:
          "Já tem um código de acesso PreçoCerto? Resgate aqui para ativar sua assinatura.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RedeemPage,
});

const CODE_RE = /^[A-Z0-9-]{6,32}$/;

function formatCode(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32);
}

function RedeemPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    addedDays?: number;
    newPaidUntil?: string | null;
  } | null>(null);

  const redeem = useServerFn(redeemMyLicenseCode);
  const fetchAccount = useServerFn(getMyAccount);

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session ?? null,
    staleTime: 30_000,
  });
  const hasSession = !!sessionQuery.data;

  useEffect(() => {
    if (sessionQuery.isPending) return;
    if (!hasSession) {
      navigate({
        to: "/login",
        search: { redirect: "/resgatar" } as never,
        replace: true,
      });
    }
  }, [sessionQuery.isPending, hasSession, navigate]);

  const accountQuery = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: hasSession && !!result?.ok,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const clean = code.trim().toUpperCase();
    if (!CODE_RE.test(clean)) {
      toast.error("Código inválido. Confira e tente novamente.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await redeem({ data: { code: clean } });
      setResult({
        ok: res.success,
        message: res.message,
        addedDays: res.addedDays,
        newPaidUntil: res.newPaidUntil,
      });
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao resgatar";
      toast.error(msg);
      setResult({ ok: false, message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-14">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Ticket className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Código de acesso
          </p>
          <h1 className="font-display text-2xl leading-tight text-foreground">
            Resgatar código promocional
          </h1>
        </div>
      </div>

      {result?.ok ? (
        <div className="rounded-3xl border border-savings/30 bg-savings/10 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-6 w-6 flex-none text-savings" />
            <div>
              <p className="font-medium text-foreground">Código ativado!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.addedDays
                  ? `${result.addedDays} dias adicionados à sua assinatura.`
                  : result.message}
              </p>
              {(result.newPaidUntil || accountQuery.data?.paidUntil) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Válido até{" "}
                  <strong className="text-foreground">
                    {new Date(
                      result.newPaidUntil ?? accountQuery.data!.paidUntil!,
                    ).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </p>
              )}
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => navigate({ to: "/app" })}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground"
            >
              Ir para o app <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setCode("");
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm text-foreground hover:bg-muted"
            >
              Resgatar outro
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Seu código
            </span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(formatCode(e.target.value))}
              placeholder="PC-XXXX-XXXX-XXXX"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 h-14 w-full rounded-xl border border-border bg-background px-4 font-mono text-lg tracking-widest text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>

          {result && !result.ok && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
              {result.message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || code.trim().length < 6}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Ativar código <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="mt-6 flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-primary" />
            <p>
              Códigos promocionais são gerados pela administração do
              PreçoCerto. Cada código é de uso único e adiciona dias à sua
              assinatura conforme o plano vinculado.
            </p>
          </div>

          <div className="pt-2 text-center text-sm">
            <Link
              to="/planos"
              className="text-muted-foreground hover:text-foreground"
            >
              Prefere comprar um plano? Ver preços →
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
