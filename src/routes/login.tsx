import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, User, Phone, MapPin, Hash, ShieldAlert, AlertCircle, Check, ShoppingCart, Ticket } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { signUpWithCpf, resolveLoginEmail } from "@/lib/account.functions";
import { maskCpf, maskPhone, maskCep, stripCpf, isValidCpf, validateCpfDetailed } from "@/lib/cpf";
import { hasPendingCartItem } from "@/lib/pending-cart";
import { safeInternalPath } from "@/lib/auth-redirect";
import {
  getBlockStatus,
  registerFailure,
  clearAttempts,
  formatCountdown,
  MAX_ATTEMPTS,
  BLOCK_MINUTES,
  type BlockStatus,
} from "@/lib/login-rate-limit";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { getLoginPanelMetrics } from "@/lib/login-panel.functions";
import { pickEditorialBackground } from "@/lib/editorial-background";
import { RegionSelector, readStoredRegion, type SelectedRegion } from "@/components/login/RegionSelector";
import { RadarCategorySheet } from "@/components/login/RadarCategorySheet";
import { CollaborativeCTA } from "@/components/collab/CollaborativeCTA";
import { SocialProofStrip } from "@/components/collab/SocialProofStrip";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — PreçoCerto" },
      {
        name: "description",
        content: "Acesse sua conta PreçoCerto com CPF e senha.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

type Address = {
  zip: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
};

const emptyAddress: Address = {
  zip: "",
  street: "",
  number: "",
  district: "",
  city: "",
  state: "",
};

// Emerald Prestige tokens — scoped to login page.
const PC_EMERALD_DEEP = "#043a2c";
const PC_EMERALD = "#064e3b";
const PC_EMERALD_LIGHT = "#0d7a5f";
const PC_GOLD = "#c9a84c";
const PC_GOLD_DARK = "#a88c3d";
const PC_CREAM = "#f5f0e0";
const PC_DISPLAY = "'Outfit', system-ui, sans-serif";
const PC_BODY = "'Figtree', system-ui, sans-serif";


function LoginPage() {
  const [mode, setModeState] = useState<"login" | "signup">(() => {
    if (typeof window === "undefined") return "login";
    const p = new URLSearchParams(window.location.search).get("mode");
    return p === "signup" ? "signup" : "login";
  });

  // Login fields
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");

  // Signup fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [cepLoading, setCepLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const router = useRouter();

  const setMode = (next: "login" | "signup") => {
    setModeState(next);
    setFormError(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "signup") url.searchParams.set("mode", "signup");
      else url.searchParams.delete("mode");
      window.history.replaceState({}, "", url.toString());
    }
  };


  // Rotating editorial background — resolved once per mount (client-only variation).
  const editorialBg = useMemo(() => pickEditorialBackground(), []);
  const [region, setRegion] = useState<SelectedRegion | null>(() =>
    typeof window === "undefined" ? null : readStoredRegion(),
  );

  const signUpFn = useServerFn(signUpWithCpf);
  const resolveEmailFn = useServerFn(resolveLoginEmail);

  const cpfDigits = useMemo(() => stripCpf(cpf), [cpf]);

  // Recalcula bloqueio quando CPF muda ou a cada segundo enquanto bloqueado
  useEffect(() => {
    if (cpfDigits.length !== 11) {
      setBlockStatus(null);
      return;
    }
    const update = () => setBlockStatus(getBlockStatus(cpfDigits));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [cpfDigits]);

  function resolvePostAuthTarget(): string {
    if (typeof window === "undefined") return "/app";
    const params = new URLSearchParams(window.location.search);
    const rawRedirect = params.get("redirect");
    const safe = safeInternalPath(rawRedirect);
    if (safe) return safe;
    if (hasPendingCartItem()) return "/";
    return "/app";
  }

  function goToPostAuthTarget() {
    const target = resolvePostAuthTarget();
    router.history.replace(target);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goToPostAuthTarget();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCepBlur() {
    const zip = address.zip.replace(/\D/g, "");
    if (zip.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      const data = (await res.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) throw new Error("CEP não encontrado");
      setAddress((a) => ({
        ...a,
        street: data.logradouro ?? a.street,
        district: data.bairro ?? a.district,
        city: data.localidade ?? a.city,
        state: data.uf ?? a.state,
      }));
    } catch {
      toast.error("Não foi possível buscar o CEP");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);

    const cpfCheck = validateCpfDetailed(cpf);
    if (!cpfCheck.valid) {
      setFormError(cpfCheck.message);
      return;
    }
    const digits = cpfCheck.digits;

    // Rate limit apenas no fluxo de login (não bloqueia cadastro de novo CPF)
    if (mode === "login") {
      const status = getBlockStatus(digits);
      if (status.blocked) {
        const msg = `Muitas tentativas erradas. Tente novamente em ${formatCountdown(status.remainingSeconds)}.`;
        setBlockStatus(status);
        setFormError(msg);
        return;
      }
    }

    const isSixDigitPin = /^\d{6}$/.test(password);
    if (!isSixDigitPin) {
      setFormError(
        mode === "signup"
          ? "Crie um PIN numérico de exatamente 6 dígitos."
          : "PIN inválido — informe os 6 dígitos numéricos.",
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        if (fullName.trim().length < 3) throw new Error("Informe seu nome completo");
        if (phone.replace(/\D/g, "").length < 10) throw new Error("Celular inválido");

        const { hiddenEmail } = await signUpFn({
          data: {
            cpf: digits,
            password,
            fullName: fullName.trim(),
            phone: phone.replace(/\D/g, ""),
            address: {
              zip: address.zip.replace(/\D/g, ""),
              street: address.street,
              number: address.number,
              district: address.district,
              city: address.city,
              state: address.state,
            },
          },
        });
        const { error } = await supabase.auth.signInWithPassword({
          email: hiddenEmail,
          password,
        });
        if (error) throw error;
        clearAttempts(digits);
        toast.success("Conta criada! 30 dias grátis liberados.");
      } else {
        const { hiddenEmail } = await resolveEmailFn({ data: { cpf: digits } });
        const { error } = await supabase.auth.signInWithPassword({
          email: hiddenEmail,
          password,
        });
        if (error) {
          const status = registerFailure(digits);
          setBlockStatus(status);
          if (status.blocked) {
            throw new Error(
              `PIN incorreto. Você excedeu ${MAX_ATTEMPTS} tentativas — aguarde ${BLOCK_MINUTES} minutos ou recupere seu PIN.`,
            );
          }
          throw new Error(
            `CPF ou PIN incorretos. ${status.attemptsLeft} tentativa${status.attemptsLeft !== 1 ? "s" : ""} restante${status.attemptsLeft !== 1 ? "s" : ""}.`,
          );
        }
        clearAttempts(digits);
        toast.success("Bem-vindo de volta!");
      }
      await router.invalidate();
      goToPostAuthTarget();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao autenticar";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center px-4 py-8 sm:px-6"
      style={{ background: PC_CREAM }}
    >
      {/* Ambient emerald glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${PC_EMERALD}33, transparent)` }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${PC_GOLD}33, transparent)` }}
        />
      </div>

      {/* Top-right link */}
      <Link
        to="/"
        className="absolute right-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-emerald-900 backdrop-blur transition hover:bg-white"
        style={{ fontFamily: PC_BODY }}
      >
        ← Voltar ao site
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 grid w-full max-w-[960px] overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_30px_80px_-30px_rgba(6,78,59,0.35)] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      >
        {/* LEFT — Emerald benefit panel */}
        <aside
          className="relative hidden flex-col justify-between p-10 md:flex"
          style={{ background: PC_EMERALD, color: PC_CREAM, fontFamily: PC_BODY }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-20 blur-3xl"
            style={{ background: PC_EMERALD_LIGHT }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2.5" style={{ fontFamily: PC_DISPLAY }}>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: PC_GOLD, color: PC_EMERALD }}
              >
                <ShoppingCart className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <span className="text-[19px] font-bold tracking-tight text-white">PreçoCerto</span>
            </div>

            <h2
              className="mt-10 text-[26px] font-bold leading-[1.12] tracking-tight text-white"
              style={{ fontFamily: PC_DISPLAY }}
            >
              {mode === "login" ? "Acesse a inteligência da sua cidade" : "Comece a economizar em minutos"}
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-white/70">
              {mode === "login"
                ? "Entre com CPF e PIN de 6 dígitos para ver o painel ao vivo."
                : "Cadastro rápido. Sem cartão de crédito. 30 dias grátis ao enviar sua primeira nota."}
            </p>

            <ul className="mt-8 space-y-3.5 text-[13px]">
              {[
                "Acesso instantâneo aos preços do bairro",
                "Comparativo em tempo real entre mercados",
                "Rede colaborativa — quanto mais notas, melhor",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ background: PC_GOLD, color: PC_EMERALD }}
                  >
                    ✓
                  </span>
                  <span className="text-white/85">{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="relative z-10 mt-10 rounded-xl border border-white/10 p-4"
            style={{ background: "rgba(13,122,95,0.28)" }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: PC_GOLD }}
            >
              Oferta ativa
            </p>
            <p
              className="mt-1 text-[17px] font-bold text-white"
              style={{ fontFamily: PC_DISPLAY }}
            >
              30 dias grátis
            </p>
            <p className="mt-0.5 text-[11px] text-white/60">
              Enviando sua nota fiscal e liberando o painel completo.
            </p>
          </div>
        </aside>

        {/* RIGHT — Auth form */}
        <div className="p-8 sm:p-10" style={{ fontFamily: PC_BODY }}>
          {/* Mobile-only compact brand row */}
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: PC_EMERALD, color: PC_GOLD }}
            >
              <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span
              className="text-[16px] font-bold tracking-tight"
              style={{ color: PC_EMERALD, fontFamily: PC_DISPLAY }}
            >
              PreçoCerto
            </span>
          </div>

          <p
            className="text-[10.5px] font-bold uppercase tracking-[0.22em]"
            style={{ color: PC_EMERALD }}
          >
            {mode === "login" ? "Área do assinante" : "Comece grátis"}
          </p>
          <h1
            className="mt-1.5 text-[26px] leading-[1.1] font-bold tracking-tight"
            style={{ color: PC_EMERALD_DEEP, fontFamily: PC_DISPLAY }}
          >
            {mode === "login" ? "Entrar na plataforma" : "Criar sua conta"}
          </h1>

          <TabSwitch mode={mode} onChange={setMode} />

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>

            {mode === "signup" && (() => {
              const trimmed = fullName.trim();
              const nameOk = trimmed.length >= 3 && /\s/.test(trimmed);
              const nameStatus: FieldStatus =
                fullName.length === 0 ? "idle" : nameOk ? "success" : "error";
              const nameMsg =
                fullName.length === 0
                  ? null
                  : nameOk
                    ? "✓ Nome válido"
                    : trimmed.length < 3
                      ? "Informe pelo menos 3 letras"
                      : "Digite nome e sobrenome";
              return (
                <Field
                  label="Nome completo"
                  placeholder="Como aparece no documento"
                  icon={User}
                  value={fullName}
                  onChange={setFullName}
                  status={nameStatus}
                  hint={nameMsg}
                  required
                />
              );
            })()}

            {(() => {
              const check = cpf.length > 0 ? validateCpfDetailed(cpf) : null;
              const status: FieldStatus =
                !check ? "idle" : check.valid ? "success" : check.reason === "incomplete" ? "idle" : "error";
              const hint = !check
                ? null
                : check.valid
                  ? "✓ CPF válido"
                  : check.message;
              return (
                <Field
                  label="CPF"
                  placeholder="000.000.000-00"
                  icon={Hash}
                  value={maskCpf(cpf)}
                  onChange={(v) => setCpf(stripCpf(v))}
                  inputMode="numeric"
                  status={status}
                  hint={hint}
                  required
                />
              );
            })()}

            {mode === "login" && blockStatus?.blocked && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Acesso temporariamente bloqueado</p>
                  <p>
                    Excedeu {MAX_ATTEMPTS} tentativas. Aguarde{" "}
                    <strong>{formatCountdown(blockStatus.remainingSeconds)}</strong> ou recupere seu PIN.
                  </p>
                </div>
              </div>
            )}
            {mode === "login" && blockStatus && !blockStatus.blocked && blockStatus.attemptsUsed > 0 && (
              <p className="pl-1 text-[11px] font-medium text-amber-600 dark:text-amber-400" aria-live="polite">
                {blockStatus.attemptsLeft} tentativa{blockStatus.attemptsLeft !== 1 ? "s" : ""} restante{blockStatus.attemptsLeft !== 1 ? "s" : ""} antes do bloqueio.
              </p>
            )}

            {mode === "signup" && (() => {
              const digits = phone.replace(/\D/g, "");
              const phoneOk = digits.length >= 10 && digits.length <= 11 && (digits.length === 10 || digits[2] === "9");
              const status: FieldStatus =
                digits.length === 0 ? "idle" : phoneOk ? "success" : digits.length < 10 ? "idle" : "error";
              const hint =
                digits.length === 0
                  ? null
                  : phoneOk
                    ? "✓ Celular válido"
                    : digits.length < 10
                      ? `Faltam ${10 - digits.length} dígito${10 - digits.length > 1 ? "s" : ""}`
                      : digits.length === 11 && digits[2] !== "9"
                        ? "Celulares começam com 9 após o DDD"
                        : "Número inválido";
              return (
                <Field
                  label="Celular"
                  placeholder="(00) 00000-0000"
                  icon={Phone}
                  value={maskPhone(phone)}
                  onChange={(v) => setPhone(v.replace(/\D/g, ""))}
                  inputMode="tel"
                  status={status}
                  hint={hint}
                  required
                />
              );
            })()}

            {mode === "signup" && (
              <details className="group rounded-xl border border-border/70 bg-card/40">
                <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground transition hover:text-foreground">
                  Endereço (opcional)
                  <span className="text-[10.5px] font-normal normal-case tracking-normal text-muted-foreground group-open:hidden">
                    adicionar
                  </span>
                </summary>
                <div className="space-y-3 border-t border-border/70 px-3.5 py-3.5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <Field
                        label="CEP"
                        placeholder="00000-000"
                        value={maskCep(address.zip)}
                        onChange={(v) => setAddress({ ...address, zip: v.replace(/\D/g, "") })}
                        onBlur={handleCepBlur}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="col-span-2">
                      <Field
                        label={cepLoading ? "Buscando..." : "Rua"}
                        icon={MapPin}
                        placeholder="Rua / Avenida"
                        value={address.street}
                        onChange={(v) => setAddress({ ...address, street: v })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Field
                      label="Número"
                      placeholder="123"
                      value={address.number}
                      onChange={(v) => setAddress({ ...address, number: v })}
                    />
                    <div className="col-span-2">
                      <Field
                        label="Bairro"
                        placeholder="Bairro"
                        value={address.district}
                        onChange={(v) => setAddress({ ...address, district: v })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Field
                        label="Cidade"
                        placeholder="Cidade"
                        value={address.city}
                        onChange={(v) => setAddress({ ...address, city: v })}
                      />
                    </div>
                    <Field
                      label="UF"
                      placeholder="UF"
                      value={address.state}
                      onChange={(v) => setAddress({ ...address, state: v.toUpperCase().slice(0, 2) })}
                    />
                  </div>
                </div>
              </details>
            )}

            {(() => {
              const pinOk = /^\d{6}$/.test(password);
              const errored = password.length === 6 && !pinOk;
              return (
                <PinField
                  value={password}
                  onChange={(v) => setPassword(v.replace(/\D/g, "").slice(0, 6))}
                  hasError={errored || (mode === "login" && !!blockStatus?.blocked)}
                />
              );
            })()}

            {formError && (
              <p
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2 text-xs font-medium text-destructive"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                !isValidCpf(cpf) ||
                !/^\d{6}$/.test(password) ||
                (mode === "login" && !!blockStatus?.blocked) ||
                (mode === "signup" &&
                  (fullName.trim().length < 3 || phone.replace(/\D/g, "").length < 10))
              }
              className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: `linear-gradient(135deg, ${PC_EMERALD_DEEP}, ${PC_EMERALD})`,
                boxShadow: `0 12px 24px -10px ${PC_EMERALD}66`,
                fontFamily: PC_DISPLAY,
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Acessar plataforma" : "Criar conta grátis"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="flex flex-col items-center gap-2 pt-1 text-[11.5px]" style={{ color: "#6b7280" }}>
              {mode === "login" && (
                <Link
                  to="/recuperar-pin"
                  className="font-semibold transition hover:underline"
                  style={{ color: PC_EMERALD }}
                >
                  Esqueceu o PIN? Recuperar por SMS
                </Link>
              )}
              <Link
                to="/resgatar"
                className="inline-flex items-center gap-1.5 font-semibold transition hover:underline"
                style={{ color: PC_GOLD_DARK }}
              >
                <Ticket className="h-3.5 w-3.5" />
                Tenho um código promocional
              </Link>
            </div>
          </form>

          <p className="mt-6 border-t border-black/5 pt-4 text-center text-[10.5px] text-gray-400">
            Ao continuar, você concorda com nossos{" "}
            <Link to="/termos" className="underline hover:text-gray-600">Termos</Link> e{" "}
            <Link to="/privacidade" className="underline hover:text-gray-600">Privacidade</Link>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}



function EditorialPanel({ region }: { region: SelectedRegion | null }) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["login-panel-metrics", region?.city ?? null, region?.neighborhood ?? null],
    queryFn: () =>
      getLoginPanelMetrics({
        data: {
          city: region?.city ?? null,
          neighborhood: region?.neighborhood ?? null,
        },
      }),
    staleTime: 30 * 60 * 1000, // 30min
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });

  const fmtBRL = (n: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(Math.max(0, n));

  const h = data?.headline;

  // Barômetro criativo — variação semanal por categoria (derivada da variação média real).
  const base = data?.avgSpreadPct ?? 0;
  const barometer = [
    { label: "Grãos & básicos", pct: base * 1.35, tone: "emerald" as const, group: "graos" as const },
    { label: "Carnes & frios", pct: base * 1.75, tone: "amber" as const, group: "carnes" as const },
    { label: "Higiene & limpeza", pct: base * 1.1, tone: "sky" as const, group: "higiene" as const },
    { label: "Bebidas & mercearia", pct: base * 0.85, tone: "violet" as const, group: "bebidas" as const },
  ];
  const [radarTarget, setRadarTarget] = useState<{
    group: "graos" | "carnes" | "higiene" | "bebidas";
    label: string;
    pct: number;
  } | null>(null);
  const sortedBarometer = [...barometer].sort((a, b) => b.pct - a.pct);
  const hottest = sortedBarometer[0];
  const maxPct = Math.max(...barometer.map((b) => b.pct), 0.001);

  const toneRing: Record<typeof barometer[number]["tone"], string> = {
    emerald: "from-emerald-400/80 to-emerald-500/10",
    amber: "from-amber-300/80 to-amber-500/10",
    sky: "from-sky-300/80 to-sky-500/10",
    violet: "from-violet-300/80 to-violet-500/10",
  };
  const toneText: Record<typeof barometer[number]["tone"], string> = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    sky: "text-sky-300",
    violet: "text-violet-300",
  };
  const toneBar: Record<typeof barometer[number]["tone"], string> = {
    emerald: "from-emerald-400 to-emerald-500/40",
    amber: "from-amber-300 to-amber-500/40",
    sky: "from-sky-300 to-sky-500/40",
    violet: "from-violet-300 to-violet-500/40",
  };

  // Re-run animations when region changes so bars/counters grow on city select.
  const animKey = `${region?.city ?? "default"}-${data ? "ready" : "loading"}`;

  return (
    <div className="my-10">
      <div className="max-w-2xl">
        <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-300/90">
          <span className="h-px w-8 bg-emerald-300/70" />
          {h?.eyebrow ?? "Radar de preços · Edição da semana"}
          {isFetching && !isLoading && (
            <Loader2 className="ml-1 h-3 w-3 animate-spin text-emerald-300/60" />
          )}
        </p>

        {/* Headline — single-line, impactful. */}
        <h2
          className="truncate font-display text-[30px] font-bold leading-[1.05] tracking-tight text-white xl:text-[36px]"
          title={h ? `${h.title} ${h.highlight} ${h.suffix}` : undefined}
        >
          {isLoading ? (
            <span className="inline-block h-[1em] w-[85%] animate-pulse rounded bg-white/10 align-middle" />
          ) : isError ? (
            <span className="text-white/70">Sem dados do barômetro no momento.</span>
          ) : h ? (
            <>
              {h.title}{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                {h.highlight.replace(/ /g, "\u00A0")}
              </span>{" "}
              {h.suffix}
            </>
          ) : null}
        </h2>

        {/* Error state with retry */}
        {isError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[12px] text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Não conseguimos calcular o barômetro agora.</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-1 text-[11px] font-semibold text-white underline underline-offset-2 hover:text-emerald-200"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Barômetro — hero card + grid de indicadores com animação */}
        <div className="mt-8 space-y-3">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-6 backdrop-blur-md">
            <div
              aria-hidden
              className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-400/20 blur-3xl"
            />
            <div className="relative flex items-end justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">
                  Maior oscilação da semana
                </p>
                <p className="mt-2 font-display text-[22px] font-semibold leading-tight text-white">
                  {isLoading ? (
                    <span className="inline-block h-5 w-40 animate-pulse rounded bg-white/10" />
                  ) : (
                    hottest.label
                  )}
                </p>
                <p className="mt-1 text-[12px] text-white/60">
                  variação registrada entre mercados monitorados
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[44px] font-bold leading-none tabular-nums text-emerald-300">
                  {isLoading ? (
                    <span className="inline-block h-10 w-20 animate-pulse rounded bg-white/10" />
                  ) : data ? (
                    <>
                      <AnimatedNumber key={animKey} value={hottest.pct} decimals={1} />
                      <span className="ml-0.5 text-[22px] text-emerald-300/80">%</span>
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  oscilação da semana

                </p>
              </div>
            </div>
            <div className="relative mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-[11px] text-white/55">Economia estimada por família</span>
              <span className="font-display text-[18px] font-bold tabular-nums text-white">
                {isLoading ? (
                  <span className="inline-block h-4 w-24 animate-pulse rounded bg-white/10" />
                ) : data ? (
                  `${fmtBRL(data.monthlySavings)}/mês`
                ) : (
                  "—"
                )}
              </span>
            </div>
          </div>

          <motion.div
            layout
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <AnimatePresence initial={false}>
              {sortedBarometer.map((b, idx) => (
                <motion.button
                  type="button"
                  layout
                  key={b.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() =>
                    setRadarTarget({ group: b.group, label: b.label, pct: b.pct })
                  }
                  aria-label={`Ver produtos em destaque de ${b.label}`}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-emerald-300/30 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
                >
                  <div
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${toneRing[b.tone]}`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">
                      {b.label}
                    </p>
                    <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white/60">
                      #{idx + 1}
                    </span>
                  </div>
                  <p
                    className={`mt-2 font-display text-[24px] font-bold tabular-nums ${toneText[b.tone]}`}
                  >
                    {isLoading ? (
                      <span className="inline-block h-6 w-14 animate-pulse rounded bg-white/10" />
                    ) : data ? (
                      <>
                        <AnimatedNumber key={animKey} value={b.pct} decimals={1} />
                        <span className="ml-0.5 text-[13px] opacity-80">%</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <AnimatePresence mode="wait">
                      {data && !isLoading && (
                        <motion.div
                          key={animKey}
                          initial={{ width: "0%" }}
                          animate={{ width: `${Math.min(100, (b.pct / maxPct) * 100)}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                          className={`h-full rounded-full bg-gradient-to-r ${toneBar[b.tone]}`}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-white/40 transition group-hover:text-emerald-300">
                    Ver produtos <ArrowRight className="h-3 w-3" />
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>

      <RadarCategorySheet
        open={!!radarTarget}
        onOpenChange={(v) => !v && setRadarTarget(null)}
        target={radarTarget}
        city={region?.city ?? null}
      />
    </div>
  );
}

/** Counter that eases from 0 → value using Framer Motion. */
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (n) => n.toFixed(decimals));
  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [mv, value]);
  return <motion.span>{rounded}</motion.span>;
}

/** Compact tab switch between login and signup. */
function TabSwitch({
  mode,
  onChange,
}: {
  mode: "login" | "signup";
  onChange: (m: "login" | "signup") => void;
}) {
  const tabs: Array<{ key: "login" | "signup"; label: string }> = [
    { key: "login", label: "Entrar" },
    { key: "signup", label: "Criar conta" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Login ou cadastro"
      className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/40 p-1"
    >
      {tabs.map((t) => {
        const active = mode === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={
              "relative h-9 rounded-lg text-[12.5px] font-semibold transition " +
              (active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

type FieldStatus = "idle" | "success" | "error";

function Field({
  label,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onChange,
  required,
  minLength,
  inputMode,
  onBlur,
  status = "idle",
  hint,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  value?: string;
  onChange?: (v: string) => void;
  required?: boolean;
  minLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onBlur?: () => void;
  status?: FieldStatus;
  hint?: string | null;
}) {
  const borderCls =
    status === "success"
      ? "border-primary/60 focus:border-primary focus:ring-primary/10"
      : status === "error"
        ? "border-destructive/60 focus:border-destructive focus:ring-destructive/10"
        : "border-input focus:border-foreground focus:ring-foreground/5";
  const hintCls =
    status === "success"
      ? "text-primary"
      : status === "error"
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          required={required}
          minLength={minLength}
          inputMode={inputMode}
          aria-invalid={status === "error" || undefined}
          className={
            "h-11 w-full rounded-xl bg-card text-sm text-foreground shadow-[0_1px_0_rgba(0,0,0,0.02)] transition placeholder:text-muted-foreground focus:outline-none focus:ring-4 " +
            borderCls +
            " border " +
            (Icon ? "pl-10 " : "pl-3.5 ") +
            (status !== "idle" ? "pr-10" : "pr-3.5")
          }
        />
        {status === "success" && (
          <Check className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        )}
        {status === "error" && (
          <AlertCircle className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
        )}
      </div>
      {hint && (
        <p
          className={`mt-1 pl-1 text-[11px] font-medium ${hintCls}`}
          aria-live="polite"
        >
          {hint}
        </p>
      )}
    </label>
  );
}


/** 6-digit PIN input with individual boxes; syncs to a single string value. */
function PinField({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  function setAt(i: number, d: string) {
    const clean = d.replace(/\D/g, "").slice(-1);
    const next = value.split("");
    next[i] = clean;
    // trim trailing empties
    const merged = next.slice(0, 6).join("").slice(0, 6);
    onChange(merged);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, 5);
    refs.current[focusIdx]?.focus();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <label
          className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
          style={{ color: PC_EMERALD }}
        >
          PIN de 6 dígitos
        </label>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            value={d.trim()}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            onPaste={handlePaste}
            aria-label={`Dígito ${i + 1} do PIN`}
            className="h-12 w-full rounded-lg border-2 bg-[#faf7ec] text-center text-xl font-bold outline-none transition"
            style={{
              borderColor: hasError
                ? "#dc2626"
                : d.trim()
                  ? PC_GOLD
                  : "rgba(6,78,59,0.14)",
              color: PC_EMERALD_DEEP,
              fontFamily: PC_DISPLAY,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = PC_GOLD;
              e.currentTarget.style.boxShadow = `0 0 0 3px ${PC_GOLD}33`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = hasError
                ? "#dc2626"
                : d.trim()
                  ? PC_GOLD
                  : "rgba(6,78,59,0.14)";
            }}
          />
        ))}
      </div>
    </div>
  );
}
