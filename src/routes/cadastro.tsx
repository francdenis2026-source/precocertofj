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
    "Alertas de queda de preço da sua cesta",
    "Rede colaborativa — envie sua nota e ganhe 30 dias",
  ];

  // Stores for the thematic illustration (economia + comparação + localização)
  const compareStores = [
    { label: "LOJA A", price: "R$ 76,10", val: 78, winner: false },
    { label: "LOJA B", price: "R$ 68,40", val: 62, winner: false },
    { label: "LOJA C", price: "R$ 59,30", val: 34, winner: true },
  ];


  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{ background: PC_CREAM, fontFamily: PC_BODY, color: "#0f172a" }}
    >
      {/* Ambient background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 420px at 90% -10%, rgba(181,138,60,0.12), transparent 60%), radial-gradient(700px 400px at -10% 110%, rgba(15,27,61,0.10), transparent 55%)",
        }}
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 md:px-8">
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

      <main className="relative z-10 flex min-h-[calc(100dvh-64px)] items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-900/10 bg-white shadow-[0_30px_80px_-30px_rgba(15,27,61,0.35)] md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
        >
          {/* LEFT — Editorial navy panel */}
          <aside
            className="relative flex flex-col justify-between overflow-hidden p-5 sm:p-6 md:p-8"
            style={{
              background: `linear-gradient(155deg, ${PC_EMERALD_DEEP} 0%, ${PC_EMERALD} 60%, ${PC_EMERALD_LIGHT} 130%)`,
              color: "#ffffff",
            }}
          >
            {/* Fine gold grid lines for editorial polish */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
                backgroundSize: "44px 44px",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
              style={{ background: "rgba(181,138,60,0.35)" }}
            />

            <div className="relative">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{
                  borderColor: "rgba(245,215,122,0.55)",
                  background: "rgba(245,215,122,0.12)",
                  color: "#F5D77A",
                }}
              >
                <UserPlus className="h-3 w-3" /> Cadastro gratuito
              </span>

              <h1
                className="mt-5 tracking-tight !text-white"
                style={{
                  fontFamily: PC_DISPLAY,
                  fontWeight: 700,
                  fontSize: "clamp(1.85rem, 2.8vw, 2.4rem)",
                  lineHeight: 1.05,
                  color: "#ffffff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                }}
              >
                <span className="!text-white">Compare preços</span>
                <br />
                <span style={{ color: "#F5D77A" }}>de verdade.</span>
              </h1>

              <p className="mt-3 max-w-[36ch] text-[13.5px] leading-relaxed text-white/95">
                Conta em 30 segundos. CPF, PIN e você já entra no comparador
                dos mercados de Feijó.
              </p>

              <ul className="mt-6 space-y-2.5">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-[13px] leading-snug text-white/95">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" style={{ color: "#F5D77A" }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Thematic illustration — localização + comparação + economia */}
            <motion.div
              className="relative mt-6 sm:mt-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.55, ease: "easeOut" }}
              aria-hidden
            >
              <svg
                viewBox="0 0 320 214"
                className="w-full max-w-[420px] mx-auto"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label="Ilustração de comparação de preços entre mercados"
              >
                <defs>
                  <linearGradient id="pcGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5D77A" />
                    <stop offset="100%" stopColor="#c9a34a" />
                  </linearGradient>
                  <linearGradient id="pcBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
                  </linearGradient>
                  <radialGradient id="pcGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(245,215,122,0.55)" />
                    <stop offset="100%" stopColor="rgba(245,215,122,0)" />
                  </radialGradient>
                </defs>

                {/* Header */}
                <g>
                  <text x="4" y="12" fill="#F5D77A" fontSize="8.5" fontFamily="ui-sans-serif, system-ui" fontWeight="800" letterSpacing="1.8">
                    COMPARATIVO · FEIJÓ/AC
                  </text>
                  <line x1="4" y1="20" x2="316" y2="20" stroke="rgba(245,215,122,0.35)" />
                </g>

                {/* Store columns */}
                {compareStores.map((s, i) => {
                  const cx = 60 + i * 100;
                  const barTop = 138 - s.val;
                  return (
                    <g key={s.label}>
                      {/* store label */}
                      <text
                        x={cx}
                        y={36}
                        textAnchor="middle"
                        fontSize="8"
                        fontFamily="ui-sans-serif, system-ui"
                        fontWeight="800"
                        fill={s.winner ? "#F5D77A" : "rgba(255,255,255,0.9)"}
                        letterSpacing="1.4"
                      >
                        {s.label}
                      </text>

                      {/* location pin */}
                      <g transform={`translate(${cx} 56)`}>
                        {s.winner && (
                          <>
                            <circle r="18" fill="url(#pcGlow)" />
                            <motion.circle
                              r="14"
                              fill="none"
                              stroke="rgba(245,215,122,0.55)"
                              strokeWidth="1"
                              initial={{ scale: 0.6, opacity: 0.8 }}
                              animate={{ scale: 1.6, opacity: 0 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                              style={{ transformOrigin: "center", transformBox: "fill-box" }}
                            />
                          </>
                        )}
                        <motion.g
                          initial={{ y: -6, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.25 + i * 0.12, duration: 0.4, ease: "easeOut" }}
                        >
                          <path
                            d="M0 -11 C-6 -11 -10 -6.5 -10 -2.5 C-10 4 0 12 0 12 C0 12 10 4 10 -2.5 C10 -6.5 6 -11 0 -11 Z"
                            fill={s.winner ? "url(#pcGold)" : "rgba(255,255,255,0.28)"}
                            stroke={s.winner ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.55)"}
                            strokeWidth="1"
                          />
                          <circle r={s.winner ? 3.4 : 2.8} cy="-3.5" fill="#0a1631" />
                        </motion.g>
                      </g>

                      {/* bar */}
                      <motion.rect
                        x={cx - 22}
                        y={138}
                        width="44"
                        height={s.val}
                        rx="6"
                        fill={s.winner ? "url(#pcGold)" : "url(#pcBar)"}
                        stroke={s.winner ? "rgba(245,215,122,0.7)" : "rgba(255,255,255,0.28)"}
                        strokeWidth="1"
                        initial={{ scaleY: 0, y: 138 }}
                        animate={{ scaleY: 1, y: barTop }}
                        transition={{ delay: 0.4 + i * 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: `${cx}px 138px`, transformBox: "fill-box" }}
                      />

                      {/* price above bar */}
                      <motion.text
                        x={cx}
                        y={barTop - 8}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontFamily="ui-monospace, 'SFMono-Regular', monospace"
                        fontWeight={s.winner ? 800 : 600}
                        fill={s.winner ? "#F5D77A" : "#ffffff"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.85 + i * 0.1, duration: 0.4 }}
                      >
                        {s.price}
                      </motion.text>

                      {s.winner && (
                        <motion.text
                          x={cx}
                          y={barTop - 22}
                          textAnchor="middle"
                          fontSize="6.5"
                          fontFamily="ui-sans-serif, system-ui"
                          fontWeight="900"
                          fill="#F5D77A"
                          letterSpacing="1.4"
                          initial={{ opacity: 0, y: barTop - 16 }}
                          animate={{ opacity: 1, y: barTop - 22 }}
                          transition={{ delay: 1.05, duration: 0.4 }}
                        >
                          ★ MELHOR PREÇO
                        </motion.text>
                      )}
                    </g>
                  );
                })}

                {/* baseline */}
                <line x1="20" y1="139" x2="300" y2="139" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />

                {/* Savings badge — hierarchy: big % + label + trend */}
                <motion.g
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.15, duration: 0.5, ease: "easeOut" }}
                >
                  {/* soft shadow */}
                  <ellipse cx="160" cy="204" rx="110" ry="4" fill="rgba(0,0,0,0.25)" />
                  {/* pill */}
                  <rect x="42" y="162" width="236" height="40" rx="20" fill="url(#pcGold)" />
                  <rect x="42" y="162" width="236" height="40" rx="20" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                  {/* big number */}
                  <text
                    x="72"
                    y="190"
                    fontSize="22"
                    fontFamily="'Outfit', ui-sans-serif, system-ui"
                    fontWeight="900"
                    fill="#0a1631"
                    letterSpacing="-0.8"
                  >
                    −22%
                  </text>
                  {/* label stack */}
                  <text
                    x="130"
                    y="181"
                    fontSize="8"
                    fontFamily="ui-sans-serif, system-ui"
                    fontWeight="900"
                    fill="#0a1631"
                    letterSpacing="1.6"
                  >
                    ECONOMIA MÉDIA
                  </text>
                  <text
                    x="130"
                    y="193"
                    fontSize="7.5"
                    fontFamily="ui-sans-serif, system-ui"
                    fontWeight="600"
                    fill="rgba(10,22,49,0.78)"
                    letterSpacing="0.3"
                  >
                    na cesta comparada
                  </text>
                  {/* trend chip */}
                  <g transform="translate(252 182)">
                    <circle r="13" fill="rgba(10,22,49,0.14)" />
                    <path d="M-4.5 -3 L0 3 L4.5 -3" stroke="#0a1631" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </motion.g>
              </svg>
            </motion.div>




            <div
              className="relative mt-6 flex items-center gap-3 rounded-xl border px-3.5 py-3"
              style={{
                borderColor: "rgba(245,215,122,0.28)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div
                className="flex h-9 w-9 flex-none items-center justify-center rounded-lg"
                style={{ background: "rgba(245,215,122,0.14)", color: "#F5D77A" }}
              >
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#F5D77A" }}>
                  Bônus de boas-vindas
                </div>
                <div className="text-[13px] leading-snug text-white/90">
                  <strong className="font-semibold">30 dias grátis</strong> ao enviar sua 1ª nota fiscal.
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT — Form */}
          <section className="relative overflow-hidden p-6 md:p-9">
            {/* Decorative SVG watermark */}
            <svg
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 opacity-[0.05]"
              viewBox="0 0 200 200"
              fill="none"
            >
              <circle cx="100" cy="100" r="80" stroke={PC_EMERALD} strokeWidth="1.2" strokeDasharray="3 4" />
              <circle cx="100" cy="100" r="55" stroke={PC_EMERALD} strokeWidth="1.2" />
              <path d="M60 110 L85 85 L105 100 L145 65" stroke={PC_EMERALD} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="145" cy="65" r="4" fill={PC_EMERALD} />
            </svg>

            {/* Header with badge icon */}
            <div className="relative mb-6 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-3">
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
                    className="text-[10.5px] font-bold uppercase tracking-[0.22em]"
                    style={{ color: PC_EMERALD }}
                  >
                    Novo assinante
                  </div>
                  <h2
                    className="mt-0.5 text-[26px] leading-[1.05] tracking-tight md:text-[28px]"
                    style={{ fontFamily: PC_DISPLAY, fontWeight: 700, color: "#0a1631" }}
                  >
                    Criar conta
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-[13.5px] font-medium text-slate-700">
                CPF, PIN de 6 dígitos e você entra direto no painel.
              </p>
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

