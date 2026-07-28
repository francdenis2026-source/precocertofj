import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { redeemMyLicenseCode, checkLicenseCodePublic } from "@/lib/licenses.functions";
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
  BadgeCheck,
  XCircle,
  Sparkles,
  Lock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

/* ============================================================
   /resgatar — Ativação de licença
   Design: single-viewport, split-screen dark cinematic.
   • Esquerda: hero navy com aura dourada + assinatura editorial.
   • Direita: painel de ativação sobre superfície semântica (card),
     sem branco puro; tokens do tema — light/dark automáticos.
   ============================================================ */

const MONO = "'JetBrains Mono', ui-monospace, monospace";

const MIN_LEN = 8;
const MAX_LEN = 24;
const CANONICAL_LEN = 14; // PC-XXXX-XXXX-XXXX

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
      nextStep: "Confira em Minhas licenças se já está ativa. Se não for você quem resgatou, fale com o suporte.",
      actions: [{ to: "/minhas-licencas", label: "Minhas licenças" }, { to: "/fale-conosco", label: "Suporte" }],
    };
  }
  if (m.includes("revogado")) {
    return {
      tone: "danger",
      title: "Código revogado",
      detail: "O administrador cancelou este código (estorno, fraude ou reemissão).",
      nextStep: "Entre em contato com o suporte para verificar a situação ou solicitar reemissão.",
      actions: [{ to: "/fale-conosco", label: "Falar com suporte" }],
    };
  }
  if (m.includes("expirad") || m.includes("expirou")) {
    return {
      tone: "warn",
      title: "Código expirado",
      detail: "A validade deste código venceu antes da ativação.",
      nextStep: "Solicite a reemissão à equipe ou adquira um novo plano para continuar.",
      actions: [{ to: "/fale-conosco", label: "Solicitar reemissão" }, { to: "/planos", label: "Ver planos" }],
    };
  }
  if (m.includes("não foi pago") || m.includes("nao foi pago") || m.includes("pendente") || m.includes("aguardando")) {
    return {
      tone: "warn",
      title: "Pagamento ainda não confirmado",
      detail: "Recebemos o código, mas o pagamento correspondente ainda não caiu no nosso sistema.",
      nextStep: "Aguarde alguns minutos após pagar e tente de novo. Se já pagou há mais tempo, envie o comprovante.",
      actions: [{ to: "/fale-conosco", label: "Enviar comprovante" }],
    };
  }
  if (m.includes("não encontrado") || m.includes("nao encontrado") || m.includes("inválido") || m.includes("invalido")) {
    return {
      tone: "danger",
      title: "Código não reconhecido",
      detail: "Não localizamos esse código. Pode ter erro de digitação ou caracteres parecidos (0/O, 1/I).",
      nextStep: "Copie e cole diretamente do e-mail da compra. Se não achar, verifique spam e promoções.",
      actions: [{ to: "/planos", label: "Ver planos" }, { to: "/fale-conosco", label: "Falar com suporte" }],
    };
  }
  return {
    tone: "info",
    title: "Não foi possível ativar",
    detail: raw || "Erro desconhecido ao processar o código.",
    nextStep: "Tente novamente em instantes. Se persistir, fale com o suporte.",
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
    <div className="relative h-[100svh] w-full overflow-hidden bg-background text-foreground">
      {/* Aura de fundo — tokens semânticos */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-70"
        style={{
          background:
            "radial-gradient(60% 40% at 15% 20%, color-mix(in oklab, var(--pc-navy) 9%, transparent), transparent 65%)," +
            "radial-gradient(50% 40% at 85% 80%, color-mix(in oklab, var(--pc-navy) 6%, transparent), transparent 65%)",
        }}
      />

      {/* Header minimal fixo */}
      <header className="relative z-20 flex h-14 items-center justify-between border-b border-border/40 bg-background/70 px-4 backdrop-blur-md md:px-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Ir para a home PreçoCerto">
          <Logo variant="default" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/planos"
            className="hidden rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground/80 transition hover:bg-muted sm:inline-flex"
          >
            Comprar plano
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground/80 transition hover:bg-muted"
          >
            ← Início
          </Link>
        </div>
      </header>

      {/* Split-screen */}
      <main className="relative z-10 grid h-[calc(100svh-3.5rem)] w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ============ ESQUERDA — HERO NAVY CINEMATIC ============ */}
        <section
          aria-label="Sobre o programa de licenças"
          className="relative hidden overflow-hidden lg:flex"
          style={{
            background:
              "linear-gradient(135deg, #0a1a3a 0%, #0f2b52 42%, #17356a 100%)",
            color: "#f6efe1",
          }}
        >
          {/* Grid dourado */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "linear-gradient(#f5b30122 1px, transparent 1px), linear-gradient(90deg, #f5b30122 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage:
                "radial-gradient(ellipse at 30% 30%, black 30%, transparent 75%)",
            }}
          />
          {/* Aura dourada */}
          <div
            aria-hidden
            className="absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, #f5b30144, transparent 65%)" }}
          />
          {/* Linhas editoriais */}
          <div
            aria-hidden
            className="absolute right-0 top-0 h-full w-px"
            style={{ background: "linear-gradient(to bottom, transparent, #f5b30155, transparent)" }}
          />

          <div className="relative z-10 flex h-full w-full flex-col justify-between p-10 xl:p-14">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.22em]"
                style={{ borderColor: "#f5b30155", color: "#ffe08a", background: "#f5b30110" }}
              >
                <Ticket className="h-3.5 w-3.5" aria-hidden />
                Ativação de licença
              </div>

              <h1
                className="pc-hero-editorial mt-8 font-editorial text-[clamp(38px,4.6vw,60px)]"
                style={{ color: "#f9f2df" }}
              >
                Libere seu acesso
                <br />
                <span
                  className="pc-editorial-accent pc-editorial-accent--fill"
                  style={{ color: "#ffd166" }}
                >
                  em segundos.
                </span>
              </h1>

              <p
                className="mt-5 max-w-[42ch] text-[14.5px] leading-relaxed"
                style={{ color: "#dfe5f4cc" }}
              >
                Informe o código{" "}
                <span className="font-mono font-semibold" style={{ color: "#ffe08a", fontFamily: MONO }}>
                  PC-XXXX-XXXX-XXXX
                </span>{" "}
                que você recebeu por e-mail. A ativação é imediata e fica vinculada ao seu CPF.
              </p>

              <ul className="mt-7 space-y-3 text-[13.5px]" style={{ color: "#eef2ff" }}>
                {[
                  { icon: Zap, label: "Ativação imediata após validar o código" },
                  { icon: Sparkles, label: "Acumule códigos e estenda sua assinatura sem perder dias" },
                  { icon: ShieldCheck, label: "Suporte prioritário para assinantes ativos" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                      style={{ background: "#f5b30122", color: "#ffd166" }}
                    >
                      <Icon className="h-3 w-3" aria-hidden />
                    </span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card de confiança */}
            <div
              className="mt-8 flex items-center gap-3 rounded-xl border p-3.5"
              style={{ borderColor: "#f5b30133", background: "#00000033", backdropFilter: "blur(6px)" }}
            >
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
                style={{ background: "#f5b30122", color: "#ffd166" }}
              >
                <Lock className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold leading-tight" style={{ color: "#ffe08a" }}>
                  Códigos assinados e rastreáveis
                </div>
                <div className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "#c9d2e6" }}>
                  Compra segura · vinculada ao seu CPF · uso único
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============ DIREITA — PAINEL DE ATIVAÇÃO (single-viewport) ============ */}
        <section
          aria-label="Formulário de ativação"
          className="relative flex h-full min-h-0 items-center justify-center overflow-hidden px-4 py-4 sm:px-8 sm:py-5"
        >
          <div className="flex max-h-full w-full max-w-[440px] flex-col">
            {/* Chip mobile — replica identidade do hero em telas pequenas */}
            <div className="mb-3 flex items-center justify-between lg:hidden">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.2em] text-primary">
                <Ticket className="h-3 w-3" aria-hidden />
                Ativação de licença
              </div>
            </div>

            {authLoading ? (
              <div className="flex min-h-[420px] flex-1 items-center justify-center" aria-live="polite">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando sessão" />
                  <span className="text-[11.5px] font-semibold uppercase tracking-[0.2em]">
                    Carregando sessão…
                  </span>
                </div>
              </div>
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
              <form onSubmit={handleSubmit} noValidate className="flex flex-col">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[color:var(--pc-home-gold)]">
                  Ativação
                </p>
                <h2 className="mt-1 text-[clamp(22px,2.6vw,30px)] font-extrabold leading-[1.1] tracking-tight text-foreground">
                  Ativar meu{" "}
                  <span className="text-[color:var(--pc-home-gold)]">código</span>
                </h2>
                <p className="mt-1.5 text-[12.5px] leading-snug text-muted-foreground">
                  Cole o código do e-mail — formato{" "}
                  <span className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[11px] font-semibold text-foreground" style={{ fontFamily: MONO }}>
                    PC-XXXX-XXXX-XXXX
                  </span>
                  .
                </p>


                <label
                  htmlFor="license-code"
                  className="mt-3 block text-[10.5px] font-bold uppercase tracking-[0.22em] text-foreground/80"
                >
                  Código de licença
                </label>
                <div className="mt-1 flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <KeyRound
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/70"
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
                        "h-11 w-full rounded-lg border bg-card pl-9 pr-3 text-[15px] font-bold uppercase tracking-[0.14em] text-foreground outline-none transition placeholder:font-semibold placeholder:tracking-[0.14em] placeholder:text-muted-foreground/70",
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
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition hover:bg-muted hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                  className="mt-1 flex items-start justify-between gap-3 text-[11.5px]"
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
                  <span className="pc-price pc-price--sm pc-price--muted shrink-0">
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
                      className={cn(
                        "mt-2 rounded-lg border px-3 py-2 text-[12px]",
                        toneClasses,
                      )}
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
                      // AAA-safe disabled: mantém contraste ≥7:1 usando foreground puro sobre muted
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

                <div className="mt-2 flex items-center justify-between text-[11.5px]">
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
            )}
          </div>
        </section>
      </main>
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
          <h2 className="font-editorial text-[26px] font-normal leading-[1.1] tracking-tight text-foreground">
            Licença{" "}
            <span className="pc-editorial-accent pc-editorial-accent--fill">ativada</span>
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            {addedDays ? `${addedDays} dias adicionados à sua assinatura.` : "Sua assinatura foi atualizada."}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-2 text-[12.5px]">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
          <dt className="text-muted-foreground">Código</dt>
          <dd className="font-mono font-bold text-foreground" style={{ fontFamily: MONO }}>{code}</dd>
        </div>
        {paidUntilLabel && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
            <dt className="text-muted-foreground">Válido até</dt>
            <dd className="font-bold text-primary">{paidUntilLabel}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          onClick={onGoApp}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-[12.5px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Ir para o app <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        <button
          onClick={onAnother}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card text-[12.5px] font-bold uppercase tracking-[0.14em] text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Ativar outro
        </button>
      </div>
    </div>
  );
}
