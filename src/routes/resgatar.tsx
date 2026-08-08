import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { redeemMyLicenseCode, checkLicenseCodePublic } from "@/lib/licenses.functions";
import { getMyAccount } from "@/lib/account.functions";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clipboard,
  AlertCircle,
  KeyRound,
  BadgeCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AuthHero } from "@/components/auth/AuthHero";
import { cn } from "@/lib/utils";

/* ============================================================
   /resgatar — Ativação de licença (v5 · unified auth shell)
   • Split-shell 880×560 idêntico a /login e /cadastro
   • AuthHero variant="login" no lado esquerdo (desktop)
   • Formulário no lado direito com typeclear do sistema
   ============================================================ */

const PC_DISPLAY = "var(--font-sans)";
const PC_BODY = "var(--font-sans)";
const MONO = "var(--font-mono)";

const MIN_LEN = 8;
const MAX_LEN = 24;
const CANONICAL_LEN = 14;

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
    return { level: "warn", message: "Caracteres inválidos foram removidos (use apenas letras e números)." };
  }
  if (clean.length < MIN_LEN) {
    const faltam = MIN_LEN - clean.length;
    return { level: "typing", message: `Continue digitando… faltam ${faltam} caractere${faltam === 1 ? "" : "s"}.` };
  }
  if (clean.length === CANONICAL_LEN && !clean.startsWith("PC")) {
    return { level: "warn", message: "O formato oficial começa com PC-. Verifique o código copiado." };
  }
  if (clean.length > CANONICAL_LEN) {
    return { level: "warn", message: `Você digitou ${clean.length} caracteres. O padrão tem ${CANONICAL_LEN} (PC-XXXX-XXXX-XXXX).` };
  }
  if (clean.length === CANONICAL_LEN && clean.startsWith("PC")) {
    return { level: "ok", message: "Formato válido. Pronto para ativar." };
  }
  return { level: "ok", message: "Pronto para tentar ativar." };
}

type RedeemErrorInfo = {
  title: string;
  detail: string;
  nextStep: string;
  tone: "danger" | "warn" | "info";
  actions: Array<{ to: string; label: string }>;
};

function classifyRedeemError(raw: string): RedeemErrorInfo {
  const m = (raw || "").toLowerCase();
  if (m.includes("já foi resgatado") || m.includes("ja foi resgatado") || m.includes("já utilizado")) {
    return {
      tone: "warn",
      title: "Este código já foi usado",
      detail: "Cada código de licença só pode ser ativado uma vez, em uma única conta.",
      nextStep: "Confira em Minhas licenças se já está ativa.",
      actions: [{ to: "/minhas-licencas", label: "Minhas licenças" }, { to: "/fale-conosco", label: "Suporte" }],
    };
  }
  if (m.includes("revogado")) {
    return {
      tone: "danger",
      title: "Código revogado",
      detail: "O administrador cancelou este código.",
      nextStep: "Entre em contato com o suporte.",
      actions: [{ to: "/fale-conosco", label: "Falar com suporte" }],
    };
  }
  if (m.includes("expirad") || m.includes("expirou")) {
    return {
      tone: "warn",
      title: "Código expirado",
      detail: "A validade deste código venceu antes da ativação.",
      nextStep: "Solicite a reemissão à equipe.",
      actions: [{ to: "/fale-conosco", label: "Solicitar reemissão" }, { to: "/planos", label: "Ver planos" }],
    };
  }
  if (m.includes("não foi pago") || m.includes("nao foi pago") || m.includes("pendente") || m.includes("aguardando")) {
    return {
      tone: "warn",
      title: "Pagamento não confirmado",
      detail: "O pagamento correspondente ainda não caiu no sistema.",
      nextStep: "Aguarde alguns minutos e tente novamente.",
      actions: [{ to: "/fale-conosco", label: "Enviar comprovante" }],
    };
  }
  if (m.includes("não encontrado") || m.includes("nao encontrado") || m.includes("inválido") || m.includes("invalido")) {
    return {
      tone: "danger",
      title: "Código não reconhecido",
      detail: "Verifique a digitação (0/O, 1/I) ou copie direto do e-mail.",
      nextStep: "Se não achar, verifique spam e promoções.",
      actions: [{ to: "/planos", label: "Ver planos" }, { to: "/fale-conosco", label: "Suporte" }],
    };
  }
  return {
    tone: "info",
    title: "Não foi possível ativar",
    detail: raw || "Erro desconhecido ao processar o código.",
    nextStep: "Tente novamente em instantes.",
    actions: [{ to: "/fale-conosco", label: "Falar com suporte" }],
  };
}

export const Route = createFileRoute("/resgatar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ativar código de licença — PreçoCerto" },
      { name: "description", content: "Ative sua assinatura PreçoCerto com o código enviado no e-mail da compra." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Ativar código de licença — PreçoCerto" },
      { property: "og:description", content: "Ative sua assinatura PreçoCerto em segundos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const checkCode = useServerFn(checkLicenseCodePublic);

  const clean = useMemo(() => sanitize(raw), [raw]);
  const display = useMemo(() => grouped(clean), [clean]);
  const validation = useMemo(() => validateCode(raw), [raw]);
  const formatOk = clean.length >= MIN_LEN && validation.level !== "warn";

  const [debouncedCode, setDebouncedCode] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCode(clean), 380);
    return () => clearTimeout(t);
  }, [clean]);

  const verifyQuery = useQuery({
    queryKey: ["license-check", debouncedCode],
    queryFn: () => checkCode({ data: { code: debouncedCode } }),
    enabled: debouncedCode.length >= MIN_LEN && validation.level !== "warn",
    staleTime: 15_000,
    retry: false,
  });

  const serverVerified = verifyQuery.data?.redeemable === true;
  const serverRejected = verifyQuery.data && verifyQuery.data.found && !verifyQuery.data.redeemable;
  const serverNotFound = verifyQuery.data && verifyQuery.data.valid && !verifyQuery.data.found;
  const canSubmit = formatOk && serverVerified && !verifyQuery.isFetching;

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
    try {
      const pending = sessionStorage.getItem("pending_license_code");
      if (pending) {
        setRaw(pending);
        sessionStorage.removeItem("pending_license_code");
      }
    } catch {}
    inputRef.current?.focus();
  }, []);

  const attemptedRef = useRef<string>("");

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (submitting) return;
    setTouched(true);
    if (!canSubmit) {
      toast.error(
        clean.length < MIN_LEN
          ? `Digite ao menos ${MIN_LEN} caracteres do código.`
          : validation.message,
      );
      return;
    }
    if (!hasSession) {
      try { sessionStorage.setItem("pending_license_code", clean); } catch {}
      toast.message("Entre na sua conta para concluir a ativação.");
      navigate({ to: "/login", search: { redirect: "/resgatar" } as never });
      return;
    }
    attemptedRef.current = clean;
    setSubmitting(true);

    try {
      const res = await redeem({ data: { code: clean } });
      if (res.success) {
        toast.success(res.message || "Licença ativada!");
        setResult({
          ok: true,
          message: res.message,
          addedDays: res.addedDays,
          newPaidUntil: res.newPaidUntil ?? null,
          code: clean,
        });
        return;
      }
      setResult({ ok: false, message: res.message, code: clean });
      toast.error(res.message);
      setRaw("");
      setTouched(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao ativar";
      toast.error(msg);
      setResult({ ok: false, message: msg, code: clean });
      setRaw("");
      setTouched(false);
      setTimeout(() => inputRef.current?.focus(), 30);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!hasSession || submitting || result) return;
    if (clean.length !== CANONICAL_LEN || !clean.startsWith("PC")) return;
    if (!serverVerified) return;
    if (attemptedRef.current === clean) return;
    handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clean, hasSession, submitting, result, serverVerified]);

  async function pasteFromClipboard() {
    try {
      const t = await navigator.clipboard.readText();
      setRaw(t);
      inputRef.current?.focus();
    } catch {
      toast.error("Não consegui ler a área de transferência");
    }
  }

  const serverStatus: "idle" | "checking" | "ok" | "rejected" | "notfound" | "error" =
    clean.length < MIN_LEN || validation.level === "warn"
      ? "idle"
      : verifyQuery.isFetching
        ? "checking"
        : verifyQuery.isError
          ? "error"
          : serverVerified
            ? "ok"
            : serverRejected
              ? "rejected"
              : serverNotFound
                ? "notfound"
                : "idle";

  return (
    <div
      className="relative flex min-h-svh w-full items-center justify-center overflow-hidden px-4 py-4 sm:px-6 sm:py-6"
      style={{ background: "var(--bg-base)", fontFamily: "var(--font-sans)" }}
    >
      {/* Ambient brand glow — paridade com login/cadastro */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      >
        <div
          className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl dark:opacity-20"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--pc-navy) 35%, transparent), transparent)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl dark:opacity-20"
          style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--pc-home-gold) 35%, transparent), transparent)" }}
        />
      </div>

      {/* Top-right link — mesma pílula das outras auth screens */}
      <Link
        to="/"
        className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] backdrop-blur transition hover:bg-[var(--bg-surface)] sm:right-5 sm:top-5 sm:px-3 sm:py-1.5"
      >
        ← Voltar ao site
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 grid w-full max-w-[880px] overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-xl)] sm:rounded-[var(--radius-3xl)] md:h-[560px] md:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]"
      >
        {/* LEFT — Hero unificado (mesma arte de login/cadastro) */}
        <div className="hidden md:block">
          <AuthHero variant="redeem" />
        </div>

        {/* RIGHT — Form/estado */}
        <section className="relative flex flex-col overflow-y-auto p-4 sm:p-5 md:p-6">
          {/* Mobile-only compact brand row */}
          <div className="mb-3 flex items-center gap-2 md:hidden">
            <img
              src="/logo-mark.png?v=5"
              alt="PreçoCerto"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 object-contain"
            />
            <span
              className="text-[15px] font-bold tracking-tight text-foreground"
              style={{ fontFamily: PC_DISPLAY }}
            >
              PreçoCerto
            </span>
          </div>

          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--pc-home-navy)] dark:text-[color:var(--pc-home-gold)]">
            Ativação de licença
          </p>

          {authLoading ? (
            <div className="mt-6 flex min-h-[320px] items-center justify-center" aria-live="polite">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando sessão" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Carregando sessão…
                </span>
              </div>
            </div>
          ) : result?.ok ? (
            <div className="mt-3">
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
            </div>
          ) : (
            <>
              <h1
                className="mt-1 text-[22px] leading-[1.15] font-bold tracking-tight text-foreground"
                style={{ fontFamily: PC_DISPLAY }}
              >
                Ativar meu <span className="text-[color:var(--pc-home-gold)]">código</span>
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
                Cole o código do e-mail — formato{" "}
                <span className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                  PC-XXXX-XXXX-XXXX
                </span>
                .
              </p>

              <form onSubmit={handleSubmit} noValidate className="mt-3 flex flex-col">
                  <label
                    htmlFor="license-code"
                    className="block text-[10.5px] font-bold uppercase tracking-[0.22em] text-foreground/80"
                  >
                    Código de licença

                  </label>
                  <div className="mt-1.5 flex items-stretch gap-2">
                    <div className="relative flex-1">
                      <KeyRound
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--pc-home-gold)]"
                        aria-hidden
                      />
                      <input
                        id="license-code"
                        ref={inputRef}
                        value={display}
                        onChange={(e) => {
                          setRaw(e.target.value);
                          if (result && !result.ok) setResult(null);
                        }}
                        onBlur={() => setTouched(true)}
                        onPaste={(e) => {
                          e.preventDefault();
                          setRaw(e.clipboardData.getData("text"));
                        }}
                        inputMode="text"
                        autoComplete="one-time-code"
                        spellCheck={false}
                        placeholder="PC-XXXX-XXXX-XXXX"
                        aria-invalid={touched && validation.level === "warn"}
                        aria-describedby="license-code-help"
                        className={cn(
                          "h-11 w-full rounded-lg border bg-background pl-9 pr-3 text-[15px] font-bold uppercase tracking-[0.14em] text-foreground outline-none transition placeholder:font-semibold placeholder:tracking-[0.14em] placeholder:text-muted-foreground/60",
                          "focus:border-primary focus:ring-2 focus:ring-primary/30",
                          touched && validation.level === "warn"
                            ? "border-destructive/70 focus:border-destructive focus:ring-destructive/30"
                            : validation.level === "ok"
                              ? "border-primary/50"
                              : "border-border",
                        )}
                        style={{ fontFamily: MONO }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={pasteFromClipboard}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[12px] font-semibold text-foreground transition hover:bg-muted hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="Colar código da área de transferência"
                    >
                      <Clipboard className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Colar</span>
                    </button>
                  </div>

                  <CodeVerifier
                    clean={clean}
                    submitting={submitting}
                    serverStatus={serverStatus}
                  />

                  <div
                    id="license-code-help"
                    aria-live="polite"
                    className="mt-1.5 flex items-start justify-between gap-3 text-[11.5px]"
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1.5",
                        validation.level === "warn"
                          ? "text-destructive"
                          : validation.level === "ok"
                            ? "text-primary"
                            : "text-foreground/70",
                      )}
                    >
                      {validation.level === "warn" && <AlertCircle className="h-3 w-3 flex-none" aria-hidden />}
                      {validation.level === "ok" && <CheckCircle2 className="h-3 w-3 flex-none" aria-hidden />}
                      <span>{validation.message}</span>
                    </span>
                    <span className="pc-num shrink-0 text-muted-foreground">
                      {clean.length}/{CANONICAL_LEN}
                    </span>
                  </div>

                  {result && !result.ok && (() => {
                    const info = classifyRedeemError(result.message);
                    const toneClasses =
                      info.tone === "danger"
                        ? "border-destructive/50 bg-destructive/10 text-destructive"
                        : info.tone === "warn"
                          ? "border-warning/50 bg-warning/10 text-warning-foreground"
                          : "border-border bg-muted text-foreground";
                    return (
                      <div
                        role="alert"
                        className={cn("mt-2.5 rounded-lg border px-3 py-2 text-[12px]", toneClasses)}
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold leading-tight">{info.title}</div>
                            <div className="mt-0.5 leading-snug">{info.detail}</div>
                            {info.actions.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {info.actions.map((a) => (
                                  <Link
                                    key={a.to}
                                    to={a.to as never}
                                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                  >
                                    {a.label}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    type="submit"
                    disabled={submitting || !canSubmit}
                    aria-disabled={submitting || !canSubmit}
                    aria-busy={submitting || (verifyQuery.isFetching && formatOk)}
                    className={cn(
                      "group relative mt-3 inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-lg text-[12.5px] font-bold uppercase tracking-[0.16em] transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      "disabled:cursor-not-allowed",
                      canSubmit && !submitting
                        ? "bg-[var(--pc-navy)] text-[color:var(--pc-home-gold)] ring-1 ring-[color:var(--pc-home-gold)]/70 shadow-[0_16px_36px_-14px_color-mix(in_oklab,var(--pc-navy)_70%,transparent)] hover:brightness-110 hover:ring-[color:var(--pc-home-gold)]"
                        : "bg-muted text-foreground/95 ring-1 ring-border",
                    )}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Ativando…</>
                    ) : verifyQuery.isFetching && formatOk ? (
                      <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Verificando…</>
                    ) : serverRejected || serverNotFound ? (
                      <><XCircle className="h-4 w-4" aria-hidden /> Código inválido</>
                    ) : !serverVerified && formatOk ? (
                      <>Aguardando verificação…</>
                    ) : (
                      <>
                        Ativar licença
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </>
                    )}
                  </button>

                  <div className="mt-2.5 flex items-center justify-between text-[11.5px]">
                    <Link
                      to="/planos"
                      className="font-semibold text-foreground/80 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                    >
                      Ainda não comprei →
                    </Link>
                    <Link
                      to="/minhas-licencas"
                      className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                    >
                      Minhas licenças →
                    </Link>
                  </div>
                </form>
            </>
          )}
        </section>
      </motion.div>
    </div>
  );
}


/* ================== Sub-blocos ================== */

function CodeVerifier({
  clean,
  submitting,
  serverStatus,
}: {
  clean: string;
  submitting: boolean;
  serverStatus: "idle" | "checking" | "ok" | "rejected" | "notfound" | "error";
}) {
  const hasPrefix = clean.startsWith("PC");
  const onlyAlphaNum = /^[A-Z0-9]*$/.test(clean);
  const fullLength = clean.length === CANONICAL_LEN;
  const serverOk = serverStatus === "ok";
  const serverBad = serverStatus === "rejected" || serverStatus === "notfound";
  const serverChecking = serverStatus === "checking";

  const checks: Array<{ label: string; state: "ok" | "pending" | "bad" | "loading" }> = [
    {
      label: "Formato",
      state:
        clean.length === 0
          ? "pending"
          : hasPrefix && onlyAlphaNum && fullLength
            ? "ok"
            : clean.length < CANONICAL_LEN
              ? "pending"
              : "bad",
    },
    {
      label: "Servidor",
      state:
        !fullLength && clean.length < MIN_LEN
          ? "pending"
          : serverChecking
            ? "loading"
            : serverOk
              ? "ok"
              : serverBad
                ? "bad"
                : "pending",
    },
  ];
  const allOk = checks.every((c) => c.state === "ok");

  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-1.5 rounded-md border px-2 py-1.5",
        allOk
          ? "border-primary/40 bg-primary/[0.06]"
          : serverBad
            ? "border-destructive/40 bg-destructive/[0.06]"
            : "border-border bg-muted/50",
      )}
      aria-label="Verificação do código"
      aria-live="polite"
    >
      <span
        className={cn(
          "flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.16em]",
          allOk ? "text-primary" : serverBad ? "text-destructive" : "text-foreground/80",
        )}
      >
        {submitting || serverChecking ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        ) : allOk ? (
          <BadgeCheck className="h-3 w-3" aria-hidden />
        ) : serverBad ? (
          <XCircle className="h-3 w-3" aria-hidden />
        ) : (
          <ShieldCheck className="h-3 w-3" aria-hidden />
        )}
        {submitting
          ? "Ativando"
          : serverChecking
            ? "Verificando"
            : allOk
              ? "Verificado"
              : serverBad
                ? "Inválido"
                : "Aguardando"}
      </span>
      <span className="mx-1 h-3 w-px bg-border" aria-hidden />
      <div className="flex flex-1 items-center gap-1 overflow-hidden">
        {checks.map((c) => {
          const cls =
            c.state === "ok"
              ? "text-primary bg-primary/15"
              : c.state === "bad"
                ? "text-destructive bg-destructive/15"
                : c.state === "loading"
                  ? "text-foreground bg-muted"
                  : "text-muted-foreground bg-muted/70";
          const dotCls =
            c.state === "ok"
              ? "bg-primary"
              : c.state === "bad"
                ? "bg-destructive"
                : "bg-muted-foreground/60";
          return (
            <span
              key={c.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                cls,
              )}
            >
              {c.state === "loading" ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
              ) : (
                <span className={cn("h-1.5 w-1.5 rounded-full", dotCls)} aria-hidden />
              )}
              {c.label}
            </span>
          );
        })}
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
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[24px] font-extrabold leading-[1.1] tracking-tight text-foreground">
            Licença{" "}
            <span className="text-[color:var(--pc-home-gold)]">ativada</span>
          </h2>
          <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
            {addedDays ? `${addedDays} dias adicionados à sua assinatura.` : "Sua assinatura foi atualizada."}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-[12.5px]">
        <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
          <dt className="text-muted-foreground">Código</dt>
          <dd className="font-mono font-bold text-foreground" style={{ fontFamily: MONO }}>{code}</dd>
        </div>
        {paidUntilLabel && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
            <dt className="text-muted-foreground">Válido até</dt>
            <dd className="font-bold text-primary">{paidUntilLabel}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={onGoApp}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-[12.5px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ir para o app <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button
          onClick={onAnother}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background text-[12.5px] font-bold uppercase tracking-[0.14em] text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Ativar outro
        </button>
      </div>
    </div>
  );
}
