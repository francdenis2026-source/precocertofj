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
  Mail,
  Copy,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";

// Emerald Prestige — mesmos tokens de /login e /cadastro
const PC_EMERALD_DEEP = "#043a2c";
const PC_EMERALD = "#064e3b";
const PC_EMERALD_LIGHT = "#0d7a5f";
const PC_GOLD = "#c9a84c";
const PC_GOLD_DARK = "#a88c3d";
const PC_CREAM = "#f5f0e0";
const PC_DISPLAY = "'Outfit', system-ui, sans-serif";
const PC_BODY = "'Figtree', system-ui, sans-serif";

const CODE_LEN = 16; // 16 caracteres úteis, exibidos como XXXX-XXXX-XXXX-XXXX
const CODE_RE = /^[A-Z0-9-]{6,32}$/;

function sanitize(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LEN);
}
function displayGrouped(v: string): string {
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
          "Digite o código de licença enviado no e-mail da sua compra para ativar sua assinatura PreçoCerto.",
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
  const grouped = useMemo(() => displayGrouped(raw), [raw]);
  const valid = clean.length >= 6;
  const invalid = touched && !valid;

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
    setTouched(true);
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
        code: clean,
      });
      if (res.success) {
        toast.success(res.message);
        // Auto-redireciona pro app após 2.5s
        setTimeout(() => navigate({ to: "/app" }), 2500);
      } else toast.error(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao resgatar";
      toast.error(msg);
      setResult({ ok: false, message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const perks = [
    "Ativação imediata — sem esperar processamento",
    "Código único, enviado no e-mail da sua compra",
    "Cada código adiciona dias à sua assinatura",
  ];

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{ background: PC_CREAM, fontFamily: PC_BODY, color: "#0f172a" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 500px at 100% 0%, rgba(201,168,76,0.18), transparent 60%), radial-gradient(900px 500px at 0% 100%, rgba(6,78,59,0.10), transparent 55%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Logo className="h-8 w-auto" />
        <Link
          to="/"
          className="rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-xs font-semibold text-slate-700 backdrop-blur hover:bg-white"
        >
          ← Voltar ao site
        </Link>
      </header>

      <main className="relative z-10 flex min-h-[calc(100dvh-88px)] items-center justify-center px-4 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        >
          {/* LEFT — painel esmeralda */}
          <div
            className="relative flex flex-col justify-between p-8 text-white md:p-10"
            style={{
              background: `linear-gradient(160deg, ${PC_EMERALD_DEEP} 0%, ${PC_EMERALD} 55%, ${PC_EMERALD_LIGHT} 130%)`,
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(600px 300px at 100% 0%, rgba(201,168,76,0.25), transparent 60%)",
              }}
            />

            <div className="relative">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: "rgba(201,168,76,0.18)", color: PC_GOLD }}
                >
                  <Ticket className="h-4 w-4" />
                </div>
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: PC_GOLD }}
                >
                  Ativar licença
                </span>
              </div>

              <h1
                className="mt-6 text-3xl leading-[1.05] tracking-tight md:text-[34px]"
                style={{ fontFamily: PC_DISPLAY, fontWeight: 700 }}
              >
                Comprou?{" "}
                <span style={{ color: PC_GOLD }}>Digite o código</span> e libere
                agora.
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
                Assim que a compra é aprovada, você recebe o código no seu
                e-mail. Cole aqui e a assinatura é ativada na hora.
              </p>

              <ul className="mt-8 space-y-3">
                {perks.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 text-sm text-white/85"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 flex-none"
                      style={{ color: PC_GOLD }}
                    />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="relative mt-8 rounded-2xl border p-4"
              style={{
                borderColor: "rgba(201,168,76,0.3)",
                background: "rgba(4,58,44,0.55)",
              }}
            >
              <div
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: PC_GOLD }}
              >
                <Mail className="h-3 w-3" /> Não achou o e-mail?
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                Verifique a caixa de spam / promoções. O remetente é
                <span className="font-semibold text-white/90">
                  {" "}
                  precocerto
                </span>{" "}
                e o assunto começa com "Seu código".
              </p>
            </div>
          </div>

          {/* RIGHT — form / sucesso */}
          <div className="p-8 md:p-10">
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
              <>
                <div className="mb-6">
                  <div
                    className="text-[11px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: PC_GOLD_DARK }}
                  >
                    Passo único
                  </div>
                  <h2
                    className="mt-1 text-2xl tracking-tight text-slate-900"
                    style={{ fontFamily: PC_DISPLAY, fontWeight: 700 }}
                  >
                    Digitar código de licença
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    16 caracteres — enviados pra você no e-mail da compra.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  <CodeField
                    value={raw}
                    display={grouped}
                    onChange={(v) => setRaw(v)}
                    onBlur={() => setTouched(true)}
                    invalid={invalid}
                    clean={clean}
                  />

                  {result && !result.ok && (
                    <p
                      className="flex items-start gap-2 rounded-xl border px-3 py-2 text-xs"
                      style={{
                        borderColor: "rgba(220,38,38,0.25)",
                        background: "rgba(254,226,226,0.6)",
                        color: "#991b1b",
                      }}
                    >
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                      <span>{result.message}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !valid}
                    className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${PC_EMERALD_LIGHT}, ${PC_EMERALD})`,
                      boxShadow: "0 10px 30px -12px rgba(6,78,59,0.55)",
                      fontFamily: PC_DISPLAY,
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

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <ShieldCheck
                        className="h-3.5 w-3.5"
                        style={{ color: PC_EMERALD_LIGHT }}
                      />
                      Código de uso único
                    </span>
                    <Link
                      to="/planos"
                      className="font-semibold hover:underline"
                      style={{ color: PC_EMERALD }}
                    >
                      Ainda não comprei →
                    </Link>
                  </div>
                </form>

                <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                  <Sparkles className="h-3 w-3" style={{ color: PC_GOLD_DARK }} />
                  Assinatura vinculada ao seu CPF.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

/* ---------- Success card (compra concluída / código aplicado) ---------- */
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
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "rgba(6,78,59,0.10)", color: PC_EMERALD }}
          >
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <span
            className="text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: PC_EMERALD }}
          >
            Licença ativada
          </span>
        </div>

        <h2
          className="mt-4 text-2xl tracking-tight text-slate-900"
          style={{ fontFamily: PC_DISPLAY, fontWeight: 700 }}
        >
          Tudo pronto —{" "}
          <span style={{ color: PC_EMERALD }}>
            {addedDays ? `${addedDays} dias` : "assinatura"}
          </span>{" "}
          liberados.
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Guarde o código abaixo caso precise consultar depois.
        </p>

        <div
          className="mt-5 rounded-2xl border p-4"
          style={{
            borderColor: "rgba(6,78,59,0.15)",
            background: "linear-gradient(180deg, #fbf7e8 0%, #fffdf6 100%)",
          }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: PC_GOLD_DARK }}
          >
            Seu código
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div
              className="truncate font-mono text-lg tracking-[0.18em] text-slate-900"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            >
              {displayGrouped(code)}
            </div>
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
          </div>
          {newPaidUntil && (
            <p className="mt-3 text-xs text-slate-500">
              Válido até{" "}
              <strong className="text-slate-900">
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
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onGoApp}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${PC_EMERALD_LIGHT}, ${PC_EMERALD})`,
            fontFamily: PC_DISPLAY,
          }}
        >
          Entrar no app <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-12 items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Outro código
        </button>
      </div>
    </div>
  );
}

/* ---------- Code field (agrupa em 4×4 e realça digitação) ---------- */
function CodeField({
  value,
  display,
  onChange,
  onBlur,
  invalid,
  clean,
}: {
  value: string;
  display: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  invalid: boolean;
  clean: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const border = invalid
    ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-500/15"
    : clean.length > 0
      ? "border-emerald-300 focus-within:border-emerald-600 focus-within:ring-emerald-600/15"
      : "border-slate-200 focus-within:border-emerald-600 focus-within:ring-emerald-600/15";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Código de licença
        </label>
        <span
          className={`text-[10px] font-semibold ${
            invalid ? "text-rose-600" : "text-slate-400"
          }`}
        >
          {clean.length}/{CODE_LEN}
        </span>
      </div>

      <div
        className={`flex items-center rounded-xl border bg-white px-3 transition focus-within:ring-2 ${border}`}
        onClick={() => ref.current?.focus()}
      >
        <span
          className="mr-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: "rgba(201,168,76,0.15)", color: PC_GOLD_DARK }}
        >
          PC
        </span>
        <input
          ref={ref}
          value={display}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={(e) => {
            e.preventDefault();
            onChange(e.clipboardData.getData("text"));
          }}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          inputMode="text"
          autoComplete="one-time-code"
          spellCheck={false}
          aria-invalid={invalid}
          className="h-12 w-full bg-transparent font-mono text-[15px] tracking-[0.22em] text-slate-900 placeholder:text-slate-300 outline-none"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
        />
      </div>

      {invalid && (
        <p className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-rose-600">
          <AlertCircle className="h-3 w-3" /> Precisa ter ao menos 6 caracteres.
        </p>
      )}
    </div>
  );
}
