import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Lock, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { signUpWithCpf } from "@/lib/account.functions";
import { maskCpf, maskPhone, stripCpf, validateCpfDetailed } from "@/lib/cpf";
import { safeInternalPath } from "@/lib/auth-redirect";
import { Logo } from "@/components/brand/Logo";

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

  // Se já estiver logado, mande direto para o destino.
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
      setError("A senha precisa ter exatamente 6 dígitos.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      setError("Informe um celular válido com DDD.");
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

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,theme(colors.emerald.500/25),transparent_45%),radial-gradient(circle_at_85%_85%,theme(colors.emerald.400/20),transparent_50%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-6 flex items-center gap-3"
        >
          <Logo className="h-9 w-auto" />
          <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-200">
            Cadastro gratuito
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl shadow-2xl"
        >
          <div className="mb-5">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <UserPlus className="h-5 w-5" />
            </div>
            <h1 className="font-display text-2xl font-bold leading-tight">
              Crie sua conta em <span className="text-emerald-300">30 segundos</span>
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Depois do cadastro você volta automaticamente para a página que estava visitando.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Field
              label="Nome completo"
              value={name}
              onChange={setName}
              placeholder="Como quer ser chamado?"
              autoComplete="name"
            />
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
            <Field
              label="Senha de 6 dígitos"
              value={password}
              onChange={(v) => setPassword(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              icon={<Lock className="h-4 w-4 text-white/40" />}
            />

            {error && (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 font-semibold text-emerald-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Criar conta e continuar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-xs text-white/60">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Seus dados ficam protegidos
            </span>
            <Link to={loginHref} className="font-semibold text-emerald-300 hover:underline">
              Já tenho conta →
            </Link>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4 inline-flex items-center justify-center gap-2 self-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70"
        >
          <Sparkles className="h-3 w-3 text-emerald-300" />
          Preços reais de mercados do Acre — 100% gratuito
        </motion.p>
      </div>
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
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-white/60">
        {label}
      </span>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 pr-9 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
        />
        {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2">{icon}</span>}
      </div>
    </label>
  );
}
