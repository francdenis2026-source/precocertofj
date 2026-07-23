import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck, UserPlus, CheckCircle2, Sparkles, AlertCircle, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { signUpWithCpf } from "@/lib/account.functions";
import { maskCpf, maskPhone, validateCpfDetailed } from "@/lib/cpf";
import { safeInternalPath } from "@/lib/auth-redirect";
import { Logo } from "@/components/brand/Logo";
import heroPhoto from "@/assets/cadastro-hero.jpg";

// ---------- Field validators ----------
type FieldState = { valid: boolean; msg?: string; hint?: string };

function validateName(v: string): FieldState {
  const t = v.trim();
  if (!t) return { valid: false };
  if (t.length < 3) return { valid: false, msg: "Muito curto — mínimo 3 letras." };
  if (t.length > 80) return { valid: false, msg: "Máximo 80 caracteres." };
  if (!t.includes(" ")) return { valid: false, msg: "Informe nome e sobrenome." };
  if (!/^[\p{L}\s'.-]+$/u.test(t)) return { valid: false, msg: "Use apenas letras." };
  return { valid: true };
}
function validateCpfField(v: string): FieldState {
  const digits = v.replace(/\D/g, "");
  if (!digits) return { valid: false };
  if (digits.length < 11) return { valid: false, hint: `${digits.length}/11 dígitos` };
  const r = validateCpfDetailed(v);
  return r.valid ? { valid: true } : { valid: false, msg: r.message };
}
function validatePhone(v: string): FieldState {
  const d = v.replace(/\D/g, "");
  if (!d) return { valid: true, hint: "Opcional" };
  if (d.length < 10) return { valid: false, hint: `${d.length}/10 dígitos` };
  if (d.length > 11) return { valid: false, msg: "Número inválido." };
  if (!/^\d{2}9?\d{8}$/.test(d)) return { valid: false, msg: "DDD + celular." };
  return { valid: true };
}
function validatePin(v: string): FieldState {
  const d = v.replace(/\D/g, "");
  if (!d) return { valid: false };
  if (d.length < 6) return { valid: false, hint: `${d.length}/6 dígitos` };
  if (/^(\d)\1{5}$/.test(d)) return { valid: false, msg: "Evite dígitos repetidos." };
  if (d === "123456" || d === "654321" || d === "012345") return { valid: false, msg: "PIN muito previsível." };
  return { valid: true };
}

// Emerald Prestige tokens — mirror /login
const PC_EMERALD_DEEP = "#0a1631";
const PC_EMERALD = "#0f1b3d";
const PC_EMERALD_LIGHT = "#1e3a5f";
const PC_GOLD = "#b58a3c";
const PC_GOLD_DARK = "#8a6b2c";
const PC_CREAM = "#f4f6fb";
const PC_DISPLAY = "'Outfit', system-ui, sans-serif";
const PC_BODY = "'Figtree', system-ui, sans-serif";

export const Route = createFileRoute("/cadastro")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect.slice(0, 500) : "",
  }),
  head: () => ({
    meta: [
      { title: "Criar conta — PreçoCerto" },
      { name: "description", content: "Cadastre-se em 30 segundos para ver os preços de cada loja." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CadastroPage,
});

function CadastroPage() {
  const { redirect: rawRedirect } = Route.useSearch();
  const safeRedirect = useMemo(() => safeInternalPath(rawRedirect) ?? "/app", [rawRedirect]);
  const loginHref = `/login?mode=login${rawRedirect ? `&redirect=${encodeURIComponent(safeRedirect)}` : ""}`;

  const navigate = useNavigate();
  const signUp = useServerFn(signUpWithCpf);

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    name: false, cpf: false, phone: false, password: false,
  });
  const markTouched = (k: keyof typeof touched) =>
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  const vName = useMemo(() => validateName(name), [name]);
  const vCpf = useMemo(() => validateCpfField(cpf), [cpf]);
  const vPhone = useMemo(() => validatePhone(phone), [phone]);
  const vPin = useMemo(() => validatePin(password), [password]);
  const allValid = vName.valid && vCpf.valid && vPhone.valid && vPin.valid;

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) navigate({ to: safeRedirect, replace: true });
    });
    return () => {
      mounted = false;
    };
  }, [navigate, safeRedirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTouched({ name: true, cpf: true, phone: true, password: true });
    if (!vName.valid) return setError(vName.msg ?? "Informe seu nome completo.");
    if (!vCpf.valid) return setError(vCpf.msg ?? "CPF inválido.");
    if (!vPin.valid) return setError(vPin.msg ?? "PIN de 6 dígitos.");
    if (!vPhone.valid) return setError(vPhone.msg ?? "Celular inválido.");

    setLoading(true);
    try {
      const res = await signUp({
        data: {
          cpf: cpf.replace(/\D/g, ""),
          password,
          fullName: name.trim(),
          phone: phone.replace(/\D/g, ""),
          address: {},
        },
      });

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: res.hiddenEmail,
        password,
      });
      if (signInErr) throw signInErr;
      toast.success("Conta criada com sucesso!");
      navigate({ to: safeRedirect, replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao criar conta.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  const perks = [
    "Comparativo em tempo real entre mercados",
    "Alertas de queda de preço",
    "Bônus: 30 dias grátis ao enviar sua nota",
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
            "radial-gradient(900px 380px at 90% -10%, rgba(181,138,60,0.10), transparent 60%), radial-gradient(600px 340px at -10% 110%, rgba(15,27,61,0.08), transparent 55%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3.5 md:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-7 w-auto" />
        </Link>
        <Link
          to={loginHref}
          className="rounded-full border border-slate-900/10 bg-white/70 px-3.5 py-1.5 text-[12px] font-semibold text-slate-700 backdrop-blur transition hover:bg-white"
        >
          Já tenho conta →
        </Link>
      </header>

      <main className="relative z-10 flex items-start justify-center px-4 pb-8 pt-2 md:items-center md:min-h-[calc(100dvh-72px)]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-[0_24px_60px_-24px_rgba(15,27,61,0.30)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        >
          {/* LEFT — Hero photo panel */}
          <aside
            className="relative hidden min-h-[520px] flex-col justify-between overflow-hidden p-6 text-white md:flex"
            style={{ color: "#ffffff" }}
          >
            {/* Photo */}
            <img
              src={heroPhoto}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Overlay for legibility */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `linear-gradient(165deg, ${PC_EMERALD_DEEP}f2 0%, ${PC_EMERALD}e6 55%, ${PC_EMERALD_LIGHT}cc 100%)`,
              }}
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-40"
              style={{ background: `linear-gradient(180deg, transparent, ${PC_EMERALD_DEEP}f2)` }}
            />

            <div className="relative">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{
                  borderColor: "rgba(245,215,122,0.55)",
                  background: "rgba(10,22,49,0.35)",
                  color: "#F5D77A",
                  backdropFilter: "blur(6px)",
                }}
              >
                <UserPlus className="h-3 w-3" /> Cadastro gratuito
              </span>

              <h1
                className="mt-4 tracking-tight !text-white"
                style={{
                  fontFamily: PC_DISPLAY,
                  fontWeight: 700,
                  fontSize: "clamp(1.7rem, 2.6vw, 2.15rem)",
                  lineHeight: 1.05,
                  color: "#ffffff",
                  textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                }}
              >
                <span className="!text-white">Compare preços</span>
                <br />
                <span style={{ color: "#F5D77A" }}>de verdade.</span>
              </h1>

              <p
                className="mt-2.5 max-w-[34ch] text-[13px] leading-relaxed text-white/95"
                style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
              >
                Conta em 30 segundos. CPF, PIN e você entra no comparador dos mercados de Feijó.
              </p>
            </div>

            <div className="relative space-y-4">
              <ul className="space-y-2">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[12.5px] leading-snug text-white/95" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.45)" }}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" style={{ color: "#F5D77A" }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              {/* Compact savings badge */}
              <div
                className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 backdrop-blur"
                style={{
                  borderColor: "rgba(245,215,122,0.55)",
                  background: "rgba(245,215,122,0.14)",
                }}
              >
                <div
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-lg"
                  style={{ background: "linear-gradient(135deg, #F5D77A, #c9a34a)", color: "#0a1631" }}
                >
                  <TrendingDown className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      style={{ fontFamily: PC_DISPLAY, color: "#F5D77A", fontWeight: 900, fontSize: 22, letterSpacing: "-0.02em" }}
                    >
                      −22%
                    </span>
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/90">
                      economia média
                    </span>
                  </div>
                  <div className="text-[11.5px] text-white/85">na cesta comparada entre mercados</div>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT — Form */}
          <section className="relative overflow-hidden p-5 sm:p-7">
            {/* Header */}
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-11 w-11 flex-none items-center justify-center rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${PC_EMERALD} 0%, ${PC_EMERALD_DEEP} 100%)`,
                  boxShadow: `inset 0 0 0 1px ${PC_GOLD}66, 0 6px 14px -6px rgba(15,27,61,0.45)`,
                }}
              >
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div
                  className="text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: PC_EMERALD }}
                >
                  Novo assinante
                </div>
                <h2
                  className="mt-0.5 text-[22px] leading-[1.05] tracking-tight"
                  style={{ fontFamily: PC_DISPLAY, fontWeight: 700, color: "#0a1631" }}
                >
                  Criar conta
                </h2>
              </div>
            </div>



            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <Field
                label="Nome completo"
                value={name}
                onChange={(v) => setName(v.toLocaleUpperCase("pt-BR"))}

                onBlur={() => markTouched("name")}
                placeholder="Nome e sobrenome"
                autoComplete="name"
                state={vName}
                showState={touched.name}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="CPF"
                  value={cpf}
                  onChange={(v) => setCpf(maskCpf(v))}
                  onBlur={() => markTouched("cpf")}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoComplete="username"
                  state={vCpf}
                  showState={touched.cpf}
                />
                <Field
                  label="Celular (opcional)"
                  value={phone}
                  onChange={(v) => setPhone(maskPhone(v))}
                  onBlur={() => markTouched("phone")}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  autoComplete="tel"
                  state={vPhone}
                  showState={touched.phone}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-900">
                    PIN de acesso · 6 dígitos
                  </label>

                  <FieldStatus state={vPin} show={touched.password} />
                </div>
                <PinField
                  value={password}
                  onChange={(v) => setPassword(v.replace(/\D/g, "").slice(0, 6))}
                  onComplete={() => markTouched("password")}
                  hasError={touched.password && !vPin.valid}
                />
                <p className="mt-2 text-[11.5px] font-medium text-slate-600">
                  Use 6 números que só você lembra. Evite datas óbvias.
                </p>
              </div>

              {error && (
                <p
                  className="flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12.5px] font-medium"
                  style={{
                    borderColor: "rgba(220,38,38,0.35)",
                    background: "rgba(254,226,226,0.7)",
                    color: "#991b1b",
                  }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                  <span>{error}</span>
                </p>
              )}

              {/* Primary CTA — navy with gold ring */}
              <button
                type="submit"
                disabled={loading || !allValid}
                className="group relative mt-2 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-[14.5px] font-bold !text-white shadow-xl transition hover:brightness-[1.08] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:brightness-100"
                style={{
                  background: allValid && !loading
                    ? `linear-gradient(135deg, ${PC_EMERALD_LIGHT} 0%, ${PC_EMERALD} 50%, ${PC_EMERALD_DEEP} 100%)`
                    : `linear-gradient(135deg, #6b7896, #4a5670)`,
                  boxShadow: allValid && !loading
                    ? `0 14px 32px -12px rgba(15,27,61,0.55), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px ${PC_GOLD}55`
                    : "0 6px 16px -8px rgba(15,27,61,0.35)",
                  fontFamily: PC_DISPLAY,
                  letterSpacing: "0.01em",
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Criando conta…</span>
                  </>
                ) : (
                  <>
                    <span>Criar conta e continuar</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-[12px]">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: PC_EMERALD }} />
                  Dados protegidos
                </span>
                <Link
                  to={loginHref}
                  className="inline-flex items-center gap-1 font-semibold transition-colors hover:opacity-80"
                  style={{ color: PC_EMERALD }}
                >
                  Já tenho conta <span aria-hidden>→</span>
                </Link>
              </div>
            </form>

            <p className="mt-6 border-t border-slate-200 pt-4 text-center text-[11.5px] font-medium text-slate-600">
              Ao continuar você aceita nossos{" "}
              <a className="font-semibold underline underline-offset-2 hover:text-slate-700" href="/termos">Termos</a>
              {" "}e a{" "}
              <a className="font-semibold underline underline-offset-2 hover:text-slate-700" href="/privacidade">Política de Privacidade</a>.
            </p>
          </section>
        </motion.div>
      </main>
    </div>
  );
}

function FieldStatus({ state, show }: { state: FieldState; show: boolean }) {
  if (!show) return null;
  if (state.valid) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> ok
      </span>
    );
  }
  const text = state.msg ?? state.hint;
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600">
      <AlertCircle className="h-3 w-3" /> {text}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
  state,
  showState,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  state?: FieldState;
  showState?: boolean;
}) {
  const invalid = !!(showState && state && !state.valid && (state.msg || state.hint));
  const good = !!(showState && state?.valid && value);
  const border = invalid
    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
    : good
      ? "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-600/20"
      : "border-slate-400 hover:border-slate-500 focus:border-[color:var(--pc-navy)] focus:ring-[color:var(--pc-navy)]/20";
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="block text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-900">
          {label}
        </span>
        {state && <FieldStatus state={state} show={!!showState} />}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className={`h-12 w-full rounded-xl border-2 ${border} bg-white px-4 text-[15px] font-medium text-slate-900 placeholder:font-normal placeholder:text-slate-500 outline-none transition focus:ring-4`}
        style={{ ["--pc-navy" as string]: PC_EMERALD } as React.CSSProperties}
      />
    </label>
  );

}

function PinField({
  value,
  onChange,
  onComplete,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: () => void;
  hasError?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function setAt(i: number, d: string) {
    const clean = d.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    while (next.length < 6) next.push("");
    next[i] = clean;
    const merged = next.slice(0, 6).join("").replace(/\s/g, "");
    onChange(merged);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (merged.length === 6) onComplete?.();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!txt) return;
    e.preventDefault();
    onChange(txt);
    refs.current[Math.min(txt.length, 5)]?.focus();
    if (txt.length === 6) onComplete?.();
  }

  const borderCls = hasError
    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
    : "border-slate-400 hover:border-slate-500 focus:border-[color:var(--pc-navy)] focus:ring-[color:var(--pc-navy)]/25";


  return (
    <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d.trim()}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          onBlur={() => value.length === 6 && onComplete?.()}
          inputMode="numeric"
          maxLength={1}
          type="password"
          aria-invalid={hasError}
          className={`h-14 w-full min-w-0 rounded-xl border-2 ${borderCls} bg-white text-center text-2xl font-black text-slate-900 shadow-[inset_0_1px_0_rgba(15,27,61,0.04)] outline-none transition focus:ring-4`}
          style={{
            ["--pc-navy" as string]: "#0f1b3d",
            fontFeatureSettings: '"tnum" 1',
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

