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
  CalendarClock,
  BadgeCheck,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { AuthHero } from "@/components/auth/AuthHero";

/* Ocean Modern — navy #0f2b52 + dourado #f5b301 (alinhado à homepage) */
const NAVY = "#0f2b52";
const NAVY2 = "#1e4a85";
const INK = "#081b3a";
const GOLD = "#f5b301";
const GOLD_SOFT = "#ffe08a";
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

type RedeemErrorInfo = {
  title: string;
  detail: string;
  nextStep: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  actions: Array<{ to: string; label: string }>;
};

function classifyRedeemError(raw: string): RedeemErrorInfo {
  const m = (raw || "").toLowerCase();
  // paletas
  const RED = { borderColor: "#fca5a5", bgColor: "#fef2f2", textColor: "#991b1b" };
  const AMBER = { borderColor: "#fcd34d", bgColor: "#fffbeb", textColor: "#92400e" };
  const SLATE = { borderColor: "#cbd5e1", bgColor: "#f8fafc", textColor: NAVY };

  if (m.includes("já foi resgatado") || m.includes("ja foi resgatado") || m.includes("já utilizado")) {
    return {
      ...AMBER,
      title: "Este código já foi usado",
      detail: "Cada código de licença só pode ser ativado uma vez, em uma única conta.",
      nextStep: "Confira em ‘Minhas licenças’ se já está ativa. Se não for você quem resgatou, fale com o suporte.",
      actions: [{ to: "/minhas-licencas", label: "Minhas licenças" }, { to: "/suporte", label: "Falar com suporte" }],
    };
  }
  if (m.includes("revogado")) {
    return {
      ...RED,
      title: "Código revogado",
      detail: "O administrador cancelou este código (ex.: estorno, fraude ou reemissão).",
      nextStep: "Entre em contato com o suporte para verificar a situação ou solicitar reemissão.",
      actions: [{ to: "/suporte", label: "Falar com suporte" }],
    };
  }
  if (m.includes("expirad") || m.includes("expirou")) {
    return {
      ...AMBER,
      title: "Código expirado",
      detail: "A validade deste código venceu antes da ativação.",
      nextStep: "Solicite a reemissão à equipe ou adquira um novo plano para continuar.",
      actions: [{ to: "/suporte", label: "Solicitar reemissão" }, { to: "/planos", label: "Ver planos" }],
    };
  }
  if (m.includes("não foi pago") || m.includes("nao foi pago") || m.includes("pendente") || m.includes("aguardando")) {
    return {
      ...AMBER,
      title: "Pagamento ainda não confirmado",
      detail: "Recebemos o código, mas o pagamento correspondente ainda não caiu no nosso sistema.",
      nextStep: "Aguarde alguns minutos após pagar e tente de novo. Se já pagou há mais tempo, envie o comprovante ao suporte.",
      actions: [{ to: "/suporte", label: "Enviar comprovante" }],
    };
  }
  if (m.includes("não encontrado") || m.includes("nao encontrado") || m.includes("inválido") || m.includes("invalido")) {
    return {
      ...RED,
      title: "Código não reconhecido",
      detail: "Não localizamos esse código na nossa base. Pode ter erro de digitação, espaços extras ou caracteres parecidos (0/O, 1/I).",
      nextStep: "Copie e cole diretamente do e-mail da compra. Se não achar o e-mail, verifique spam e promoções.",
      actions: [{ to: "/planos", label: "Ver planos" }, { to: "/suporte", label: "Falar com suporte" }],
    };
  }
  return {
    ...SLATE,
    title: "Não foi possível ativar",
    detail: raw || "Erro desconhecido ao processar o código.",
    nextStep: "Tente novamente em instantes. Se o problema persistir, entre em contato com o suporte.",
    actions: [{ to: "/suporte", label: "Falar com suporte" }],
  };
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
  const checkCode = useServerFn(checkLicenseCodePublic);

  const clean = useMemo(() => sanitize(raw), [raw]);
  const display = useMemo(() => grouped(clean), [clean]);
  const validation = useMemo(() => validateCode(raw), [raw]);
  const formatOk = clean.length >= MIN_LEN && validation.level !== "warn";

  // Debounce do valor limpo para a verificação no servidor
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
        // Mostra tela de confirmação com validade + botão para o painel.
        setResult({
          ok: true,
          message: res.message,
          addedDays: res.addedDays,
          newPaidUntil: res.newPaidUntil ?? null,
          code: clean,
        });
        return;
      }
      // Falha (código já usado, expirado, revogado, inválido):
      // libera imediatamente o campo para nova tentativa.
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

  // Auto-envio: só depois do servidor confirmar que o código é resgatável
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

  return (
    <div
      className="min-h-[100svh]"
      style={{ background: "#f5f6fa", fontFamily: "'Figtree', system-ui, sans-serif", color: INK }}
    >
      {/* Header slim */}
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo variant="on-light" className="h-7 w-auto" />
        </Link>
        <Link
          to="/"
          className="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition hover:bg-white"
          style={{ borderColor: LINE, color: NAVY }}
        >
          ← Início
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border bg-white shadow-[0_16px_48px_-24px_rgba(15,27,61,0.35)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" style={{ borderColor: LINE }}>
          {/* LEFT — Hero reutilizável */}
          <AuthHero variant="redeem" />
          {/* RIGHT — Card compacto branco */}
          <div className="overflow-hidden bg-white">

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
              <div className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: GOLD_SOFT }}>
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
                className="font-editorial text-[clamp(19px,2.4vw,26px)] font-normal leading-tight"
                style={{ color: INK, letterSpacing: "-0.015em" }}
              >
                Ativar meu <span className="pc-editorial-accent italic">código</span>
              </h1>
              <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>
                Cole o código que chegou no seu e-mail — formato <span className="font-mono font-semibold" style={{ color: NAVY }}>PC-XXXX-XXXX-XXXX</span>. O acesso libera na hora.
              </p>

              {/* Campo único grande — legível e compacto */}
              <label
                htmlFor="license-code"
                className="mt-4 block text-[11px] font-bold uppercase tracking-[0.18em]"
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
                    className="h-12 w-full rounded-lg border bg-white pl-9 pr-3 text-[15px] font-bold uppercase tracking-[0.14em] outline-none transition placeholder:font-semibold placeholder:tracking-[0.14em] placeholder:text-slate-400 focus:ring-2"
                    style={{
                      fontFamily: MONO,
                      color: INK,
                      borderColor:
                        touched && validation.level === "warn"
                          ? "#dc2626"
                          : validation.level === "ok"
                          ? "#16a34a"
                          : "#cbd5e1",
                    } as React.CSSProperties}

                  />
                </div>
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  className="inline-flex items-center gap-1.5 rounded-lg border-2 px-3 text-[12px] font-semibold transition hover:bg-slate-50"
                  style={{ borderColor: "#cbd5e1", color: NAVY }}
                  aria-label="Colar código da área de transferência"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Colar</span>
                </button>
              </div>

              {/* Verificador compacto — checks em tempo real */}
              <CodeVerifier
                clean={clean}
                submitting={submitting}
                serverStatus={
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
                    : "idle"
                }
              />

              {/* Feedback em tempo real */}
              <div
                id="license-code-help"
                aria-live="polite"
                className="mt-1.5 flex items-start justify-between gap-3 text-[11px]"
              >
                <span
                  className="flex items-center gap-1.5"
                  style={{
                    color:
                      validation.level === "warn"
                        ? "#dc2626"
                        : validation.level === "ok"
                        ? "#15803d"
                        : MUTED,
                  }}
                >
                  {validation.level === "warn" && <AlertCircle className="h-3 w-3 flex-none" />}
                  {validation.level === "ok" && <CheckCircle2 className="h-3 w-3 flex-none" />}
                  <span>{validation.message}</span>
                </span>
                <span className="shrink-0 tabular-nums" style={{ color: MUTED }}>
                  {clean.length}/{CANONICAL_LEN}
                </span>
              </div>

              {result && !result.ok && (() => {
                const info = classifyRedeemError(result.message);
                return (
                  <div
                    role="alert"
                    className="mt-3 rounded-lg border px-3.5 py-3 text-[12.5px]"
                    style={{ borderColor: info.borderColor, background: info.bgColor, color: info.textColor }}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold leading-tight">{info.title}</div>
                        <div className="mt-0.5 leading-snug opacity-90">{info.detail}</div>
                        <div className="mt-1.5 text-[11.5px] font-semibold" style={{ color: info.textColor }}>
                          Próximo passo: <span className="font-normal">{info.nextStep}</span>
                        </div>
                        {info.actions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {info.actions.map((a: { to: string; label: string }) => (
                              <Link
                                key={a.to}
                                to={a.to as never}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white"
                                style={{ background: NAVY }}
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
                className="group relative mt-4 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-lg text-[13px] font-bold uppercase tracking-[0.14em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
                style={{
                  background:
                    canSubmit && !submitting
                      ? GOLD
                      : "#e6c877",
                  color: INK,
                  boxShadow:
                    canSubmit && !submitting
                      ? `0 12px 28px -10px ${GOLD}, inset 0 1px 0 rgba(255,255,255,0.35)`
                      : `0 6px 14px -8px ${GOLD}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  opacity: canSubmit || submitting ? 1 : 0.85,
                  // @ts-expect-error css var for focus ring
                  "--tw-ring-color": NAVY,
                  "--tw-ring-offset-color": "#ffffff",
                }}
              >
                {/* Navy accent bar for premium feel */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${NAVY}, transparent)` }}
                />
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Ativando…</>
                ) : verifyQuery.isFetching && formatOk ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verificando código…</>
                ) : serverRejected || serverNotFound ? (
                  <><XCircle className="h-4 w-4" style={{ color: "#7f1d1d" }} /> Código inválido</>
                ) : !serverVerified && formatOk ? (
                  <>Aguardando verificação…</>
                ) : (
                  <>
                    Ativar licença
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: NAVY }} />
                  </>
                )}
              </button>





              <div className="mt-2 text-right">
                <Link to="/minhas-licencas" className="text-[11px] font-semibold hover:underline" style={{ color: NAVY }}>
                  Minhas licenças →
                </Link>
              </div>


              {/* Garantias em linha compacta */}
              <ul className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-[11px] font-semibold" style={{ borderColor: "#cbd5e1", color: "#334155" }}>
                <li className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" style={{ color: NAVY }} />Uso único</li>
                <li className="flex items-center gap-1"><KeyRound className="h-3 w-3" style={{ color: NAVY }} />Ligado ao CPF</li>
                <li className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" style={{ color: NAVY }} />Ativação imediata</li>

              </ul>
            </form>
          )}
        </div>
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

/**
 * Verificador compacto de código: mostra 3 checks em tempo real.
 * Pequeno, profissional, sem ocupar espaço vertical.
 */
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
      className="mt-2 flex items-center gap-1.5 rounded-md border px-2 py-1.5"
      style={{
        borderColor: allOk ? "#86efac" : serverBad ? "#fca5a5" : "#cbd5e1",
        background: allOk ? "#f0fdf4" : serverBad ? "#fef2f2" : "#f8fafc",
      }}
      aria-label="Verificação do código"
      aria-live="polite"
    >
      <span
        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: allOk ? "#166534" : serverBad ? "#991b1b" : INK }}
      >
        {submitting || serverChecking ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : allOk ? (
          <BadgeCheck className="h-3 w-3" />
        ) : serverBad ? (
          <XCircle className="h-3 w-3" />
        ) : (
          <ShieldCheck className="h-3 w-3" />
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
      <span className="mx-1 h-3 w-px" style={{ background: LINE }} />
      <div className="flex flex-1 items-center gap-1 overflow-hidden">
        {checks.map((c) => {
          const palette =
            c.state === "ok"
              ? { color: "#166534", bg: "#dcfce7", dot: "#16a34a" }
              : c.state === "bad"
              ? { color: "#991b1b", bg: "#fee2e2", dot: "#dc2626" }
              : c.state === "loading"
              ? { color: NAVY, bg: "#eef2ff", dot: "#6366f1" }
              : { color: "#334155", bg: "#e2e8f0", dot: "#64748b" };
          return (
            <span
              key={c.label}
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold"
              style={{ color: palette.color, background: palette.bg }}
            >
              {c.state === "loading" ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: palette.dot }} aria-hidden />
              )}
              {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}




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
          className="inline-flex h-11 items-center justify-center rounded-lg text-[13px] font-bold uppercase tracking-[0.14em]"
          style={{ background: GOLD, color: NAVY }}
        >
          Entrar
        </Link>
        <Link
          to="/cadastro"
          className="inline-flex h-11 items-center justify-center rounded-lg border text-[13px] font-bold uppercase tracking-[0.14em]"
          style={{ borderColor: GOLD, color: NAVY, background: "#fffbeb" }}
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

/* ------- Painel de detalhes do código (preview antes de enviar) ------- */
function CodePreviewPanel({
  loading,
  data,
  enabled,
}: {
  loading: boolean;
  data: import("@/lib/licenses.functions").LicensePreview | null;
  enabled: boolean;
}) {
  if (!enabled && !loading && !data) return null;

  if (loading) {
    return (
      <div
        className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[12px]"
        style={{ borderColor: LINE, background: "#f8fafc", color: MUTED }}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: NAVY }} />
        Consultando código no sistema…
      </div>
    );
  }
  if (!data) return null;

  if (!data.found) {
    return (
      <div
        className="mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12px]"
        style={{ borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b" }}
      >
        <XCircle className="mt-0.5 h-4 w-4 flex-none" />
        <span>{data.message}</span>
      </div>
    );
  }

  const good = data.redeemable;
  const border = good ? "#bbf7d0" : "#fcd34d";
  const bg = good ? "#f0fdf4" : "#fffbeb";
  const ink = good ? "#166534" : "#92400e";
  const badgeIcon = good ? <BadgeCheck className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />;

  const expLabel = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const refundLabel = data.refundDeadline
    ? new Date(data.refundDeadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    : null;

  return (
    <div
      className="mt-3 rounded-xl border p-3 text-[12px]"
      style={{ borderColor: border, background: bg, color: INK }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: ink }}>
          {badgeIcon}
          {data.statusLabel}
        </div>
        {data.planName && (
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ borderColor: border, color: ink, background: "#ffffff" }}
          >
            {data.planName}
          </span>
        )}
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-white px-2.5 py-1.5" style={{ borderColor: LINE }}>
          <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            <CalendarClock className="h-3 w-3" /> Validade
          </dt>
          <dd className="mt-0.5 text-[12.5px] font-bold" style={{ color: data.isExpired ? "#dc2626" : NAVY }}>
            {expLabel}
            {data.daysUntilExpiry != null && !data.isExpired && (
              <span className="ml-1 text-[11px] font-normal" style={{ color: MUTED }}>
                (em {data.daysUntilExpiry}d)
              </span>
            )}
          </dd>
        </div>
        <div className="rounded-lg border bg-white px-2.5 py-1.5" style={{ borderColor: LINE }}>
          <dt className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
            <RefreshCcw className="h-3 w-3" /> Reembolso
          </dt>
          <dd
            className="mt-0.5 text-[12.5px] font-bold"
            style={{ color: data.refundable ? "#15803d" : "#991b1b" }}
          >
            {data.refundable
              ? refundLabel
                ? `Sim · até ${refundLabel}`
                : "Sim"
              : "Não disponível"}
          </dd>
        </div>
        {data.planDays != null && (
          <div className="rounded-lg border bg-white px-2.5 py-1.5" style={{ borderColor: LINE }}>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
              Duração
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-bold" style={{ color: NAVY }}>
              {data.planDays} dias
            </dd>
          </div>
        )}
        {data.priceCents != null && (
          <div className="rounded-lg border bg-white px-2.5 py-1.5" style={{ borderColor: LINE }}>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>
              Valor
            </dt>
            <dd className="mt-0.5 text-[12.5px] font-bold" style={{ color: NAVY }}>
              R$ {(data.priceCents / 100).toFixed(2).replace(".", ",")}
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-2.5 text-[11.5px] leading-snug" style={{ color: ink }}>
        {data.message}
      </p>
    </div>
  );
}
