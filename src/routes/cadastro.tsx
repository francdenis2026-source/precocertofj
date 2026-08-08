import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck, UserPlus, CheckCircle2, Sparkles, AlertCircle, User, CreditCard, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { signUpWithCpf } from "@/lib/account.functions";
import { maskCpf, maskPhone, validateCpfDetailed } from "@/lib/cpf";
import { safeInternalPath } from "@/lib/auth-redirect";
import { Logo } from "@/components/brand/Logo";
import { LoginShell } from "@/components/auth/LoginShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brl } from "@/lib/format";

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
const PC_EMERALD_DEEP = "var(--brand-primary)";
const PC_EMERALD = "var(--brand-primary)";
const PC_EMERALD_LIGHT = "var(--brand-primary-soft)";
const PC_GOLD = "var(--brand-accent)";
const PC_GOLD_DARK = "var(--brand-accent)";
const PC_CREAM = "var(--bg-base)";
const PC_DISPLAY = "var(--font-sans)";
const PC_BODY = "var(--font-sans)";

export const Route = createFileRoute("/cadastro")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect.slice(0, 500) : "",
  }),
  head: () => ({
    meta: [
      { title: "Criar conta — PreçoCerto" },
      { name: "description", content: "Cadastre-se em 30 segundos para ver os preços de cada mercado." },
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
  /** True enquanto verificamos sessão para redirecionar sem flash do formulário. */
  const [redirecting, setRedirecting] = useState(false);
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
      if (mounted && data.session) {
        setRedirecting(true);
        navigate({ to: safeRedirect, replace: true });
      }
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
    <LoginShell
      title="Crie sua conta"
      subtitle="Cadastre-se para economizar nos mercados"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div className="space-y-4">
          <Field
            label="Nome completo"
            value={name}
            onChange={(v) => setName(v.toLocaleUpperCase("pt-BR").slice(0, 80))}
            onBlur={() => markTouched("name")}
            placeholder="Ex: JOÃO DA SILVA"
            autoComplete="name"
            state={vName}
            showState={touched.name}
            maxLength={80}
          />

          <Field
            label="CPF"
            value={cpf}
            onChange={(v) => setCpf(maskCpf(v).slice(0, 14))}
            onBlur={() => markTouched("cpf")}
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="username"
            state={vCpf}
            showState={touched.cpf}
            maxLength={14}
          />

          <Field
            label="Celular"
            value={phone}
            onChange={(v) => setPhone(maskPhone(v).slice(0, 15))}
            onBlur={() => markTouched("phone")}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            autoComplete="tel"
            state={vPhone}
            showState={touched.phone}
            maxLength={15}
          />

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B] flex items-center gap-2">
                <Lock className="w-3 h-3" /> PIN de 6 dígitos
              </label>
              <FieldStatus state={vPin} show={touched.password} />
            </div>
            <PinField
              value={password}
              onChange={(v) => setPassword(v.replace(/\D/g, "").slice(0, 6))}
              onComplete={() => markTouched("password")}
              hasError={touched.password && !vPin.valid}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex gap-3 text-rose-600 text-sm font-medium animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !allValid}
          className="w-full h-14 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-base font-black shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>CRIANDO CONTA...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>CRIAR MINHA CONTA</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          )}
        </Button>

        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#64748B] uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Seus dados estão protegidos
          </div>
          <Link
            to={loginHref}
            className="text-sm font-bold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            Já tem uma conta? Entre agora
          </Link>
        </div>
      </form>
    </LoginShell>
  );
}

function FieldStatus({ state, show }: { state: FieldState; show: boolean }) {
  if (!show) return null;
  if (state.valid) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> ok
      </span>
    );
  }
  const text = state.msg ?? state.hint;
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
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
  maxLength,
  icon: Icon,
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
  maxLength?: number;
  icon?: any;
}) {
  const invalid = !!(showState && state && !state.valid && (state.msg || state.hint));
  const good = !!(showState && state?.valid && value);
  const border = invalid
    ? "border-rose-200 focus:border-rose-400 focus:ring-rose-500/5"
    : good
      ? "border-emerald-200 focus:border-emerald-400 focus:ring-emerald-500/5"
      : "border-[#E5EAF1] focus:border-[#2563EB] focus:ring-[#2563EB]/5";
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B] flex items-center gap-2">
          {Icon && <Icon className="w-3 h-3" />}
          {label}
        </label>
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
        maxLength={maxLength}
        className={cn(
          "w-full h-12 px-4 rounded-2xl bg-[#F8FAFC] border-2 text-sm font-bold text-[#0F172A] outline-none transition-all placeholder:text-[#94A3B8] placeholder:font-medium",
          border
        )}
      />
    </div>
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
          className={`h-10 w-full min-w-0 rounded-lg border-2 ${borderCls} bg-white text-center text-lg font-black text-slate-900 shadow-[inset_0_1px_0_rgba(15,27,61,0.04)] outline-none transition focus:ring-4`}
          style={{
            ["--pc-navy" as string]: "#0f1b3d",
            fontFeatureSettings: '"tnum" 1',
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

