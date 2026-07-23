import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  Copy,
  AlertCircle,
  KeyRound,
  Fingerprint,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";

/* ------------------------------------------------------------------ */
/* Design tokens — “Vault” look, distinto do /login                    */
/* ------------------------------------------------------------------ */
const PC = {
  ink: "#0a1226",
  navy: "#0f1b3d",
  navyLight: "#1a2a52",
  gold: "#b58a3c",
  goldSoft: "#f2dfa8",
  paper: "#f6f7fb",
  line: "rgba(255,255,255,0.14)",
};
const DISPLAY = "'Outfit', system-ui, sans-serif";
const BODY = "'Figtree', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const SEG_LEN = 4;
const SEG_COUNT = 4;
const TOTAL_LEN = SEG_LEN * SEG_COUNT;
const CODE_RE = /^[A-Z0-9]{6,32}$/;

function sanitize(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, TOTAL_LEN);
}
function grouped(v: string): string {
  const s = sanitize(v);
  return s.replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

export const Route = createFileRoute("/resgatar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ativar licença — PreçoCerto" },
      {
        name: "description",
        content:
          "Insira o código de licença enviado no e-mail da sua compra para desbloquear a assinatura PreçoCerto.",
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

  const redeem = useServerFn(redeemMyLicenseCode);
  const fetchAccount = useServerFn(getMyAccount);

  const clean = useMemo(() => sanitize(raw), [raw]);
  const valid = clean.length === TOTAL_LEN;
  const invalid = touched && clean.length > 0 && !valid;

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

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (submitting) return;
    setTouched(true);
    if (!CODE_RE.test(clean)) {
      toast.error("Código incompleto. Digite os 16 caracteres.");
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
        setTimeout(() => navigate({ to: "/app" }), 2500);
      } else toast.error(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao ativar";
      toast.error(msg);
      setResult({ ok: false, message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{
        background: `radial-gradient(1200px 700px at 50% -10%, ${PC.navyLight} 0%, ${PC.navy} 45%, ${PC.ink} 100%)`,
        fontFamily: BODY,
        color: "#fff",
      }}
    >
      {/* Ornament */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, transparent, ${PC.gold}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute -left-40 top-20 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: `${PC.gold}22` }}
      />
      <div
        className="pointer-events-none absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: `${PC.navyLight}55` }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-5 py-5 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <span
            className="hidden items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] md:inline-flex"
            style={{ borderColor: PC.line, color: PC.goldSoft }}
          >
            <Lock className="h-3 w-3" /> Ativação segura
          </span>
          <Link
            to="/"
            className="rounded-full border px-3 py-1.5 text-[11px] font-semibold text-white/85 backdrop-blur transition hover:bg-white/10"
            style={{ borderColor: PC.line }}
          >
            ← Início
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-88px)] w-full max-w-2xl flex-col items-center justify-center px-4 pb-12">
        {result?.ok ? (
          <SuccessCard
            code={result.code ?? clean}
            addedDays={result.addedDays}
            newPaidUntil={result.newPaidUntil ?? accountQuery.data?.paidUntil ?? null}
            onReset={() => {
              setResult(null);
              setRaw("");
              setTouched(false);
            }}
            onGoApp={() => navigate({ to: "/app" })}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative w-full"
          >
            {/* Stepper */}
            <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/85">
              <StepDot done>Compra</StepDot>
              <span className="h-px w-6" style={{ background: PC.gold }} />
              <StepDot active>Ativação</StepDot>
              <span className="h-px w-6 bg-white/20" />
              <StepDot>Acesso liberado</StepDot>
            </div>

            {/* Card principal */}
            <div
              className="relative overflow-hidden rounded-3xl border shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)`,
                borderColor: PC.line,
                backdropFilter: "blur(8px)",
              }}
            >
              {/* Ribbon topo */}
              <div
                className="flex items-center gap-2 border-b px-6 py-3"
                style={{
                  background: `linear-gradient(90deg, ${PC.gold}18, transparent)`,
                  borderColor: PC.line,
                }}
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${PC.gold}25`, color: PC.goldSoft }}
                >
                  <Ticket className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div
                    className="text-[10px] font-bold uppercase tracking-[0.24em]"
                    style={{ color: PC.goldSoft }}
                  >
                    Protocolo de ativação
                  </div>
                  <div className="text-[12px] text-white/85">
                    Código enviado ao seu e-mail após a compra
                  </div>
                </div>
                <Fingerprint
                  className="hidden h-5 w-5 md:block"
                  style={{ color: PC.goldSoft, opacity: 0.7 }}
                />
              </div>

              {/* Corpo */}
              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <h1
                  className="text-center leading-[1.05]"
                  style={{
                    fontFamily: DISPLAY,
                    fontWeight: 700,
                    fontSize: "clamp(1.6rem, 4vw, 2rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Digite seu código de{" "}
                  <span style={{ color: PC.goldSoft }}>16 caracteres</span>
                </h1>
                <p className="mx-auto mt-2 max-w-md text-center text-[13px] text-white/85">
                  A ativação é imediata. Você não precisa reinstalar nada — a
                  assinatura entra em vigor no seu CPF logado.
                </p>

                <form onSubmit={handleSubmit} className="mt-7" noValidate>
                  <SegmentedOtp
                    value={clean}
                    onChange={setRaw}
                    onComplete={() => handleSubmit()}
                    invalid={invalid}
                  />

                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span
                      className={
                        invalid ? "text-rose-300" : "text-white/85"
                      }
                    >
                      {invalid
                        ? "Código incompleto"
                        : `${clean.length}/${TOTAL_LEN} caracteres`}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const t = await navigator.clipboard.readText();
                          setRaw(t);
                        } catch {
                          toast.error("Não consegui ler a área de transferência");
                        }
                      }}
                      className="inline-flex items-center gap-1 font-semibold text-white/85 hover:text-white"
                    >
                      <Copy className="h-3 w-3" /> Colar do e-mail
                    </button>
                  </div>

                  {result && !result.ok && (
                    <p
                      className="mt-4 flex items-start gap-2 rounded-xl border px-3 py-2 text-[12px]"
                      style={{
                        borderColor: "rgba(248,113,113,0.35)",
                        background: "rgba(248,113,113,0.10)",
                        color: "#fecaca",
                      }}
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                      <span>{result.message}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !valid}
                    className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold uppercase tracking-[0.14em] shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45"
                    style={{
                      background: `linear-gradient(135deg, ${PC.goldSoft} 0%, ${PC.gold} 100%)`,
                      color: PC.ink,
                      boxShadow: `0 14px 30px -12px ${PC.gold}80`,
                      fontFamily: DISPLAY,
                    }}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Ativar licença <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Guarantee icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Uso único" />
                    <Guarantee icon={<KeyRound className="h-3.5 w-3.5" />} label="Vinculado ao seu CPF" />
                    <Guarantee icon={<Lock className="h-3.5 w-3.5" />} label="Criptografia TLS" />
                  </div>
                </form>
              </div>
            </div>

            {/* Rodapé com nota administrativa */}
            <div className="mt-5 space-y-2 text-center">
              <p className="text-[11px] text-white/85">
                Não achou o e-mail? Verifique a caixa de{" "}
                <strong className="text-white">spam / promoções</strong> — o
                assunto começa com <em>“Seu código”</em>.
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/80">
                Códigos emitidos, validados e revogados pela equipe administrativa
              </p>
              <div className="flex items-center justify-center gap-3 pt-1 text-[11px]">
                <Link
                  to="/planos"
                  className="font-semibold text-white/90 underline-offset-2 hover:underline"
                  style={{ color: PC.goldSoft }}
                >
                  Ainda não comprei →
                </Link>
                <span className="text-white/40">•</span>
                <Link
                  to="/minhas-licencas"
                  className="font-semibold text-white/85 underline-offset-2 hover:underline"
                >
                  Minhas licenças
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

/* ----------------------- Segmented OTP tile input ----------------------- */
function SegmentedOtp({
  value,
  onChange,
  onComplete,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: () => void;
  invalid: boolean;
}) {
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const chars = value.padEnd(TOTAL_LEN, " ").split("");
  const focusIndex = Math.min(value.length, TOTAL_LEN - 1);

  useEffect(() => {
    if (value.length === TOTAL_LEN) onComplete?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div
      className="relative"
      onClick={() => hiddenRef.current?.focus()}
      role="group"
      aria-label="Código de licença"
    >
      <input
        ref={hiddenRef}
        value={value}
        onChange={(e) => onChange(sanitize(e.target.value))}
        onPaste={(e) => {
          e.preventDefault();
          onChange(sanitize(e.clipboardData.getData("text")));
        }}
        inputMode="text"
        autoComplete="one-time-code"
        spellCheck={false}
        maxLength={TOTAL_LEN}
        aria-invalid={invalid}
        className="absolute inset-0 h-full w-full opacity-0"
        style={{ caretColor: "transparent" }}
      />

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: SEG_COUNT }).map((_, seg) => (
          <div
            key={seg}
            className="flex items-center gap-1 rounded-xl border p-1.5"
            style={{
              borderColor: invalid ? "rgba(248,113,113,0.55)" : PC.line,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {Array.from({ length: SEG_LEN }).map((_, k) => {
              const i = seg * SEG_LEN + k;
              const ch = chars[i].trim();
              const filled = !!ch;
              const isFocus = i === focusIndex && value.length < TOTAL_LEN;
              return (
                <div
                  key={k}
                  className={`flex h-10 flex-1 items-center justify-center rounded-md text-[15px] font-bold transition sm:h-11 sm:text-[16px] ${
                    isFocus ? "ring-2" : ""
                  }`}
                  style={{
                    fontFamily: MONO,
                    color: filled ? "#fff" : "rgba(255,255,255,0.35)",
                    background: filled
                      ? "rgba(181,138,60,0.22)"
                      : "rgba(255,255,255,0.03)",
                    boxShadow: isFocus
                      ? `inset 0 0 0 1px ${PC.goldSoft}`
                      : undefined,
                  }}
                >
                  {filled ? ch : "•"}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */
function StepDot({
  children,
  active,
  done,
}: {
  children: React.ReactNode;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        color: active ? PC.goldSoft : done ? "#fff" : "rgba(255,255,255,0.65)",
      }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{
          background: active
            ? PC.goldSoft
            : done
              ? "rgba(255,255,255,0.85)"
              : "rgba(255,255,255,0.35)",
        }}
      />
      {children}
    </span>
  );
}

function Guarantee({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold text-white/90"
      style={{ borderColor: PC.line, background: "rgba(255,255,255,0.03)" }}
    >
      <span style={{ color: PC.goldSoft }}>{icon}</span>
      {label}
    </div>
  );
}

/* --------------------------- Success card --------------------------- */
function SuccessCard({
  code,
  addedDays,
  newPaidUntil,
  onReset,
  onGoApp,
}: {
  code: string;
  addedDays?: number;
  newPaidUntil: string | null;
  onReset: () => void;
  onGoApp: () => void;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="w-full max-w-lg rounded-3xl border p-6 sm:p-8"
      style={{
        borderColor: PC.line,
        background: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`,
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: `${PC.goldSoft}22`, color: PC.goldSoft }}
        >
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div
          className="mt-3 text-[10px] font-bold uppercase tracking-[0.24em]"
          style={{ color: PC.goldSoft }}
        >
          Licença ativada
        </div>
        <h2
          className="mt-2 leading-[1.05]"
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: "clamp(1.5rem, 3.6vw, 1.9rem)",
          }}
        >
          {addedDays ? `+${addedDays} dias liberados` : "Assinatura liberada"}
        </h2>
        <p className="mt-1 text-[13px] text-white/85">
          Redirecionando para o app em instantes…
        </p>

        <div
          className="mt-5 w-full rounded-2xl border p-3"
          style={{
            borderColor: PC.line,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: PC.goldSoft }}
          >
            Seu código
          </div>
          <div className="mt-1 flex items-center justify-between gap-3">
            <div
              className="truncate text-[15px] tracking-[0.18em]"
              style={{ fontFamily: MONO }}
            >
              {grouped(code)}
            </div>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold text-white/90 hover:bg-white/10"
              style={{ borderColor: PC.line }}
            >
              <Copy className="h-3 w-3" /> Copiar
            </button>
          </div>
          {newPaidUntil && (
            <p className="mt-2 text-[11px] text-white/85">
              Válido até{" "}
              <strong className="text-white">
                {new Date(newPaidUntil).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
              .
            </p>
          )}
        </div>

        <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onGoApp}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold uppercase tracking-[0.14em]"
            style={{
              background: `linear-gradient(135deg, ${PC.goldSoft}, ${PC.gold})`,
              color: PC.ink,
              fontFamily: DISPLAY,
            }}
          >
            Entrar no app <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-12 items-center justify-center rounded-xl border px-4 text-sm font-semibold text-white/90 hover:bg-white/10"
            style={{ borderColor: PC.line }}
          >
            Outro código
          </button>
        </div>
      </div>
    </motion.div>
  );
}
