import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck, UserPlus, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { signUpWithCpf } from "@/lib/account.functions";
import { maskCpf, maskPhone, validateCpfDetailed } from "@/lib/cpf";
import { safeInternalPath } from "@/lib/auth-redirect";
import { Logo } from "@/components/brand/Logo";

// Emerald Prestige tokens — mirror /login
const PC_EMERALD_DEEP = "#043a2c";
const PC_EMERALD = "#064e3b";
const PC_EMERALD_LIGHT = "#0d7a5f";
const PC_GOLD = "#c9a84c";
const PC_GOLD_DARK = "#a88c3d";
const PC_CREAM = "#f5f0e0";
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
    if (!name.trim() || name.trim().length < 3) {
      setError("Informe seu nome completo.");
      return;
    }
    const cpfCheck = validateCpfDetailed(cpf);
    if (!cpfCheck.valid) {
      setError(cpfCheck.message);
      return;
    }
    if (!/^\d{6}$/.test(password)) {
      setError("O PIN precisa ter exatamente 6 dígitos.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits && phoneDigits.length < 10) {
      setError("Informe um celular válido com DDD ou deixe em branco.");
      return;
    }
    setLoading(true);
    try {
      const res = await signUp({
        data: {
          cpf: cpfCheck.digits,
          password,
          fullName: name.trim(),
          phone: phoneDigits,
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
    "Alertas de queda de preço da sua cesta",
    "Rede colaborativa — envie sua nota e ganhe 30 dias",
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
          {/* LEFT — Emerald panel */}
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
                  <UserPlus className="h-4 w-4" />
                </div>
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: PC_GOLD }}
                >
                  Cadastro gratuito
                </span>
              </div>

              <h1
                className="mt-6 text-3xl leading-[1.05] tracking-tight md:text-[34px]"
                style={{ fontFamily: PC_DISPLAY, fontWeight: 700 }}
              >
                Crie sua conta em{" "}
                <span style={{ color: PC_GOLD }}>30 segundos</span>
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
                Cadastre-se e volte automaticamente para o painel que estava
                visitando. Sem cartão, sem letra miúda.
              </p>

              <ul className="mt-8 space-y-3">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-white/85">
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
                className="text-[10px] font-bold uppercase tracking-[0.2em]"
                style={{ color: PC_GOLD }}
              >
                Oferta ativa
              </div>
              <div
                className="mt-1 text-lg"
                style={{ fontFamily: PC_DISPLAY, fontWeight: 700 }}
              >
                30 dias grátis
              </div>
              <p className="mt-1 text-xs leading-relaxed text-white/70">
                Enviando sua primeira nota fiscal após o cadastro.
              </p>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="p-8 md:p-10">
            <div className="mb-6">
              <div
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: PC_GOLD_DARK }}
              >
                Novo assinante
              </div>
              <h2
                className="mt-1 text-2xl tracking-tight text-slate-900"
                style={{ fontFamily: PC_DISPLAY, fontWeight: 700 }}
              >
                Criar conta
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                CPF, PIN de 6 dígitos e pronto.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field
                label="Nome completo"
                value={name}
                onChange={setName}
                placeholder="Como quer ser chamado?"
                autoComplete="name"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="CPF"
                  value={cpf}
                  onChange={(v) => setCpf(maskCpf(v))}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  autoComplete="username"
                />
                <Field
                  label="Celular (opcional)"
                  value={phone}
                  onChange={(v) => setPhone(maskPhone(v))}
                  placeholder="(00) 00000-0000"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label
                  className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"
                >
                  PIN de acesso (6 dígitos)
                </label>
                <PinField
                  value={password}
                  onChange={(v) => setPassword(v.replace(/\D/g, "").slice(0, 6))}
                />
              </div>

              {error && (
                <p
                  className="rounded-xl border px-3 py-2 text-xs"
                  style={{
                    borderColor: "rgba(220,38,38,0.25)",
                    background: "rgba(254,226,226,0.6)",
                    color: "#991b1b",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg transition disabled:opacity-60"
                style={{
                  background: `linear-gradient(135deg, ${PC_EMERALD_LIGHT}, ${PC_EMERALD})`,
                  boxShadow: "0 10px 30px -12px rgba(6,78,59,0.55)",
                  fontFamily: PC_DISPLAY,
                }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Criar conta e continuar <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: PC_EMERALD_LIGHT }} />
                  Dados protegidos
                </span>
                <Link
                  to={loginHref}
                  className="font-semibold hover:underline"
                  style={{ color: PC_EMERALD }}
                >
                  Já tenho conta →
                </Link>
              </div>
            </form>

            <p className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <Sparkles className="h-3 w-3" style={{ color: PC_GOLD_DARK }} />
              Ao continuar, você aceita nossos Termos e Privacidade.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500"
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
      />
    </label>
  );
}

function PinField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function setAt(i: number, d: string) {
    const clean = d.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    while (next.length < 6) next.push("");
    next[i] = clean;
    onChange(next.slice(0, 6).join("").replace(/\s/g, ""));
    if (clean && i < 5) refs.current[i + 1]?.focus();
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
  }

  return (
    <div className="flex gap-2">
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
          inputMode="numeric"
          maxLength={1}
          type="password"
          className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white text-center text-lg font-semibold text-slate-900 outline-none transition focus:border-[color:var(--pc-gold)] focus:ring-2 focus:ring-[color:var(--pc-gold)]/25"
          style={{ ["--pc-gold" as string]: PC_GOLD } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
