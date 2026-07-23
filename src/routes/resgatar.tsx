import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { redeemMyLicenseCode } from "@/lib/licenses.functions";
import { getMyAccount } from "@/lib/account.functions";
import {
  Loader2,
  Ticket,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clipboard,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";

/* Tokens Navy Trust — alto contraste */
const NAVY = "#0f1b3d";
const NAVY2 = "#1a2a52";
const INK = "#0a1226";
const GOLD = "#b58a3c";
const GOLD_SOFT = "#f2dfa8";
const LINE = "#e5e7ef";
const MUTED = "#475569";

const MONO = "'JetBrains Mono', ui-monospace, monospace";

/* Aceita 8–24 chars alfanuméricos (códigos PC-XXXX-XXXX-XXXX = 14) */
const MIN_LEN = 8;
const MAX_LEN = 24;
const CANONICAL_LEN = 14; // PC + 12 alfanum

type ValidationLevel = "empty" | "typing" | "warn" | "ok";
type ValidationState = { level: ValidationLevel; message: string };

function sanitize(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MAX_LEN);
}
function grouped(v: string): string {
  const s = sanitize(v);
  return s.replace(/(.{4})(?=.)/g, "$1-");
}
function validateCode(rawInput: string): ValidationState {
  const clean = sanitize(rawInput);
  if (clean.length === 0) {
    return { level: "empty", message: "Cole ou digite o código recebido no e-mail." };
  }
  const stripped = rawInput.replace(/[\s-]/g, "").toUpperCase();
  if (stripped.length > 0 && /[^A-Z0-9]/.test(stripped)) {
    return {
      level: "warn",
      message: "Caracteres inválidos foram removidos (use apenas letras e números).",
    };
  }
  if (clean.length < MIN_LEN) {
    const faltam = MIN_LEN - clean.length;
    return {
      level: "typing",
      message: `Continue digitando… faltam ${faltam} caractere${faltam === 1 ? "" : "s"}.`,
    };
  }
  if (clean.length === CANONICAL_LEN && !clean.startsWith("PC")) {
    return { level: "warn", message: "O formato oficial começa com PC-. Verifique o código copiado." };
  }
  if (clean.length > CANONICAL_LEN) {
    return {
      level: "warn",
      message: `Você digitou ${clean.length} caracteres. O padrão tem ${CANONICAL_LEN} (PC-XXXX-XXXX-XXXX).`,
    };
  }
  if (clean.length === CANONICAL_LEN && clean.startsWith("PC")) {
    return { level: "ok", message: "Formato válido. Pronto para ativar." };
  }
  return { level: "ok", message: "Pronto para tentar ativar." };
}

export const Route = createFileRoute("/resgatar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ativar código de licença — PreçoCerto" },
      {
        name: "description",
        content:
          "Insira o código de licença enviado no e-mail da sua compra para ativar sua assinatura PreçoCerto.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RedeemPage,
});

function RedeemPage() {
  const navigate = useNavigate();
  const [raw, setRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    addedDays?: number;
    newPaidUntil?: string | null;
    code?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const redeem = useServerFn(redeemMyLicenseCode);
  const fetchAccount = useServerFn(getMyAccount);

  const clean = useMemo(() => sanitize(raw), [raw]);
  const display = useMemo(() => grouped(clean), [clean]);
  const valid = clean.length >= MIN_LEN;
  const invalid = touched && clean.length > 0 && !valid;

  const sessionQuery = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session ?? null,
    staleTime: 30_000,
  });
  const hasSession = !!sessionQuery.data;
  const authLoading = sessionQuery.isPending;

  const accountQuery = useQuery({
    queryKey: ["my-account"],
    queryFn: () => fetchAccount(),
    enabled: hasSession && !!result?.ok,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (submitting) return;
    setTouched(true);
    if (!valid) {
      toast.error("Digite ao menos 8 caracteres do código.");
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
        code: clean,
      });
      if (res.success) {
        toast.success(res.message);
        setTimeout(() => navigate({ to: "/app" }), 2200);
      } else toast.error(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao ativar";
      toast.error(msg);
      setResult({ ok: false, message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      setRaw(t);
      inputRef.current?.focus();
    } catch {
      toast.error("Não consegui ler a área de transferência");
    }
  }

  return (
    <div
      className="min-h-[100dvh]"
      style={{ background: "#f5f6fa", fontFamily: "'Figtree', system-ui, sans-serif", color: INK }}
    >
      {/* Header slim */}
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
        </Link>
        <Link
          to="/"
          className="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white"
          style={{ borderColor: LINE, color: NAVY }}
        >
          ← Início
        </Link>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-12">
        {/* Card compacto branco — alto contraste */}
        <div
          className="overflow-hidden rounded-2xl border bg-white shadow-[0_16px_48px_-24px_rgba(15,27,61,0.35)]"
          style={{ borderColor: LINE }}
        >
          {/* Faixa navy topo */}
          <div
            className="flex items-center gap-3 px-5 py-3.5"
            style={{
              background: `linear-gradient(90deg, ${NAVY} 0%, ${NAVY2} 100%)`,
              color: "#fff",
            }}
          >
            <div
              className="grid h-9 w-9 place-items-center rounded-lg"
              style={{ background: `${GOLD}33`, color: GOLD_SOFT }}
            >
              <Ticket className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD_SOFT }}>
                Ativação de licença
              </div>
              <div className="truncate text-[12.5px] font-medium text-white/90">
                Código enviado no seu e-mail após a compra
              </div>
            </div>
          </div>

          {authLoading ? (
            <div className="flex items-center justify-center px-5 py-16">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: NAVY }} />
            </div>
          ) : !hasSession ? (
            <SignInGate />
          ) : result?.ok ? (
            <SuccessBody
              code={result.code ?? clean}
              addedDays={result.addedDays}
              newPaidUntil={result.newPaidUntil ?? accountQuery.data?.paidUntil ?? null}
              onGoApp={() => navigate({ to: "/app" })}
              onAnother={() => {
                setResult(null);
                setRaw("");
                setTouched(false);
                setTimeout(() => inputRef.current?.focus(), 30);
              }}
            />
          ) : (
            <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-6 sm:py-6" noValidate>
              <h1
                className="text-[18px] font-bold leading-tight"
                style={{ color: INK, letterSpacing: "-0.01em" }}
              >
                Digite o código de ativação
              </h1>
              <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>
                Formato: <span className="font-mono font-semibold" style={{ color: NAVY }}>PC-XXXX-XXXX-XXXX</span>. Copiar e colar do e-mail funciona.
              </p>

              {/* Campo único grande — legível e compacto */}
              <label
                htmlFor="license-code"
                className="mt-4 block text-[10.5px] font-bold uppercase tracking-[0.18em]"
                style={{ color: NAVY }}
              >
                Código de licença
              </label>
              <div className="mt-1.5 flex items-stretch gap-2">
                <div className="relative flex-1">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: NAVY2 }}
                  />
                  <input
                    id="license-code"
                    ref={inputRef}
                    value={display}
                    onChange={(e) => setRaw(e.target.value)}
                    onBlur={() => setTouched(true)}
                    onPaste={(e) => {
                      e.preventDefault();
                      setRaw(e.clipboardData.getData("text"));
                    }}
                    inputMode="text"
                    autoComplete="one-time-code"
                    spellCheck={false}
                    placeholder="PC-XXXX-XXXX-XXXX"
                    aria-invalid={invalid}
                    className="h-12 w-full rounded-lg border bg-white pl-9 pr-3 text-[15px] font-bold uppercase tracking-[0.14em] outline-none transition focus:ring-2"
                    style={{
                      fontFamily: MONO,
                      color: INK,
                      borderColor: invalid ? "#dc2626" : LINE,
                    } as React.CSSProperties}
                  />
                </div>
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition hover:bg-slate-50"
                  style={{ borderColor: LINE, color: NAVY }}
                  aria-label="Colar código da área de transferência"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Colar</span>
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span style={{ color: invalid ? "#dc2626" : MUTED }}>
                  {invalid
                    ? "Digite ao menos 8 caracteres"
                    : `${clean.length} caractere${clean.length === 1 ? "" : "s"}`}
                </span>
                <Link to="/minhas-licencas" className="font-semibold hover:underline" style={{ color: NAVY }}>
                  Minhas licenças
                </Link>
              </div>

              {result && !result.ok && (
                <div
                  className="mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[12.5px]"
                  style={{
                    borderColor: "#fca5a5",
                    background: "#fef2f2",
                    color: "#991b1b",
                  }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{result.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !valid}
                className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-bold uppercase tracking-[0.14em] transition disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                  background: valid ? NAVY : "#94a3b8",
                  color: "#fff",
                  boxShadow: valid ? `0 10px 24px -12px ${NAVY}` : undefined,
                }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ativar licença <ArrowRight className="h-4 w-4" /></>}
              </button>

              {/* Garantias em linha compacta */}
              <ul className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-[10.5px]" style={{ borderColor: LINE, color: MUTED }}>
                <li className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" style={{ color: NAVY }} />Uso único</li>
                <li className="flex items-center gap-1"><KeyRound className="h-3 w-3" style={{ color: NAVY }} />Ligado ao CPF</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" style={{ color: NAVY }} />Ativação imediata</li>
              </ul>
            </form>
          )}
        </div>

        {/* Nota fora do card */}
        <p className="mt-4 text-center text-[11px]" style={{ color: MUTED }}>
          Não achou o e-mail? Verifique <strong style={{ color: NAVY }}>spam / promoções</strong>. Códigos são
          emitidos, validados e revogados pela equipe administrativa.
        </p>
        <div className="mt-2 flex items-center justify-center gap-3 text-[11.5px] font-semibold">
          <Link to="/planos" className="hover:underline" style={{ color: NAVY }}>Ainda não comprei →</Link>
          <span style={{ color: LINE }}>•</span>
          <Link to="/minhas-licencas" className="hover:underline" style={{ color: NAVY }}>Minhas licenças</Link>
        </div>
      </main>
    </div>
  );
}

/* ------- Sub-blocos ------- */

function SignInGate() {
  return (
    <div className="px-5 py-6 sm:px-6">
      <h2 className="text-[16px] font-bold" style={{ color: INK }}>
        Faça login para ativar
      </h2>
      <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>
        Você precisa estar autenticado com o CPF vinculado à compra para resgatar o código.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          to="/login"
          search={{ redirect: "/resgatar" } as never}
          className="inline-flex h-11 items-center justify-center rounded-lg text-[13px] font-bold uppercase tracking-[0.14em] text-white"
          style={{ background: NAVY }}
        >
          Entrar
        </Link>
        <Link
          to="/cadastro"
          className="inline-flex h-11 items-center justify-center rounded-lg border text-[13px] font-bold uppercase tracking-[0.14em]"
          style={{ borderColor: LINE, color: NAVY }}
        >
          Criar conta
        </Link>
      </div>
    </div>
  );
}

function SuccessBody({
  code,
  addedDays,
  newPaidUntil,
  onGoApp,
  onAnother,
}: {
  code: string;
  addedDays?: number;
  newPaidUntil: string | null;
  onGoApp: () => void;
  onAnother: () => void;
}) {
  const paidUntilLabel = newPaidUntil
    ? new Date(newPaidUntil).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;
  return (
    <div className="px-5 py-6 sm:px-6">
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ background: "#dcfce7", color: "#15803d" }}
        >
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[16px] font-bold" style={{ color: INK }}>
            Licença ativada com sucesso
          </h2>
          <p className="mt-0.5 text-[12.5px]" style={{ color: MUTED }}>
            {addedDays ? `${addedDays} dias adicionados à sua assinatura.` : "Sua assinatura foi atualizada."}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-[12.5px]">
        <div className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: LINE }}>
          <dt style={{ color: MUTED }}>Código</dt>
          <dd className="font-mono font-bold" style={{ color: INK }}>{code}</dd>
        </div>
        {paidUntilLabel && (
          <div className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: LINE }}>
            <dt style={{ color: MUTED }}>Válido até</dt>
            <dd className="font-bold" style={{ color: NAVY }}>{paidUntilLabel}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onGoApp}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg text-[13px] font-bold uppercase tracking-[0.14em] text-white"
          style={{ background: NAVY }}
        >
          Ir para o app <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onAnother}
          className="inline-flex h-11 items-center justify-center rounded-lg border text-[13px] font-bold uppercase tracking-[0.14em]"
          style={{ borderColor: LINE, color: NAVY }}
        >
          Ativar outro
        </button>
      </div>
    </div>
  );
}
