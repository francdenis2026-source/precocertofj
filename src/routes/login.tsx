import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, User, Phone, MapPin, Hash, ShieldCheck, Ticket, Calendar, Home, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

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
  MAX_ATTEMPTS,
  type BlockStatus,
} from "@/lib/login-rate-limit";
import { toast } from "sonner";
import { notify } from "@/lib/notify";

import { AuthSidebar } from "@/components/auth/AuthSidebar";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthButton } from "@/components/auth/AuthButton";
import { PinInput } from "@/components/auth/PinInput";

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

function LoginPage() {
  const [mode, setModeState] = useState<"login" | "signup">(() => {
    if (typeof window === "undefined") return "login";
    const p = new URLSearchParams(window.location.search).get("mode");
    return p === "signup" ? "signup" : "login";
  });

  // Signup Steps: 1 (Personal), 2 (Contact), 3 (Security)
  const [signupStep, setSignupStep] = useState(1);
  const [success, setSuccess] = useState(false);

  // Form states
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState<Address>(emptyAddress);
  
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [blockStatus, setBlockStatus] = useState<BlockStatus | null>(null);
  const router = useRouter();

  const setMode = (next: "login" | "signup") => {
    setModeState(next);
    setFormError(null);
    setSignupStep(1);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (next === "signup") url.searchParams.set("mode", "signup");
      else url.searchParams.delete("mode");
      window.history.replaceState({}, "", url.toString());
    }
  };

  const signUpFn = useServerFn(signUpWithCpf);
  const resolveEmailFn = useServerFn(resolveLoginEmail);

  const cpfDigits = useMemo(() => stripCpf(cpf), [cpf]);

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
  }, []);

  async function handleCepBlur() {
    const zip = address.zip.replace(/\D/g, "");
    if (zip.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      const data = (await res.json()) as any;
      if (data.erro) throw new Error("CEP não encontrado");
      setAddress((a) => ({
        ...a,
        street: data.logradouro ?? a.street,
        district: data.bairro ?? a.district,
        city: data.localidade ?? a.city,
        state: data.uf ?? a.state,
      }));
    } catch {
      toast.error("CEP não encontrado");
    }
  }

  const validateStep = () => {
    setFormError(null);
    if (signupStep === 1) {
      if (fullName.trim().split(" ").length < 2) {
        setFormError("Informe seu nome completo");
        return false;
      }
      if (!isValidCpf(cpf)) {
        setFormError("CPF inválido");
        return false;
      }
    } else if (signupStep === 2) {
      if (phone.replace(/\D/g, "").length < 10) {
        setFormError("Celular inválido");
        return false;
      }
      if (!address.city) {
        setFormError("Informe sua cidade");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) setSignupStep((s) => s + 1);
  };

  const prevStep = () => setSignupStep((s) => s - 1);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading) return;
    setFormError(null);

    const digits = stripCpf(cpf);
    if (mode === "login") {
      const status = getBlockStatus(digits);
      if (status.blocked) {
        setFormError("Muitas tentativas erradas. Tente novamente mais tarde.");
        return;
      }
    }

    if (password.length !== 6) {
      setFormError("Informe seu PIN de 6 dígitos");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
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
        setSuccess(true);
      } else {
        const { hiddenEmail } = await resolveEmailFn({ data: { cpf: digits } });
        const { error } = await supabase.auth.signInWithPassword({
          email: hiddenEmail,
          password,
        });
        if (error) {
          registerFailure(digits);
          throw new Error("CPF ou PIN incorretos.");
        }
        setSuccess(true);
      }
      
      clearAttempts(digits);
      setTimeout(() => {
        router.invalidate().then(() => goToPostAuthTarget());
      }, 1500);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao autenticar";
      setFormError(msg);
      notify.error("Acesso negado", { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-svh w-full items-center justify-center bg-[var(--bg-base)] p-0 sm:p-4 overflow-hidden">
      <div className="relative flex h-full max-h-full sm:max-h-[720px] w-full max-w-[1100px] overflow-hidden sm:rounded-[var(--pc-radius-lg)] border-0 sm:border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-2xl">
        
        {/* Lado Esquerdo - Painel Institucional (Escondido em Mobile) */}
        <div className="hidden lg:block w-[45%] shrink-0">
          <AuthSidebar />
        </div>

        {/* Lado Direito - Formulários */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          
          {/* Header Mobile / Back Link */}
          <div className="flex items-center justify-between p-6 lg:p-8 shrink-0">
            <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-1.5 lg:hidden">
              <img src="/logo-mark.png?v=5" alt="Logo" className="w-7 h-7" />
              <span className="text-lg font-bold tracking-tight text-slate-900 font-display">PreçoCerto</span>
            </div>
            <div className="w-6 h-6" /> {/* Spacer */}
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 lg:px-12 pb-12 overflow-y-auto no-scrollbar">
            <AnimatePresence mode="wait">
              {mode === "login" ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-display">
                      Bem-vindo <span className="text-[var(--brand-primary)]">de volta</span>
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">
                      Acesse sua conta para continuar economizando.
                    </p>
                  </div>

                  <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); }}>
                    <AuthInput
                      label="CPF"
                      icon={Hash}
                      value={maskCpf(cpf)}
                      onChange={(e) => setCpf(stripCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      success={isValidCpf(cpf)}
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">PIN de 6 dígitos</label>
                        <Link to="/resgatar" className="text-[11px] font-bold text-[var(--brand-primary)] uppercase tracking-widest hover:underline">Esqueci meu PIN</Link>
                      </div>
                      <PinInput 
                        value={password}
                        onChange={(v) => {
                          setPassword(v);
                          if (v.length === 6 && isValidCpf(cpf)) {
                            handleSubmit();
                          }
                        }}
                        error={!!formError}
                        disabled={loading || success}
                      />
                    </div>

                    <div className="pt-2">
                      <AuthButton 
                        loading={loading}
                        success={success}
                        onClick={handleSubmit}
                        disabled={!isValidCpf(cpf) || password.length !== 6}
                      >
                        Entrar na conta
                      </AuthButton>
                    </div>

                    <div className="text-center pt-4">
                      <p className="text-xs font-medium text-slate-500">
                        Não tem uma conta?{" "}
                        <button
                          type="button"
                          onClick={() => setMode("signup")}
                          className="text-[var(--brand-primary)] font-bold hover:underline"
                        >
                          Começar agora
                        </button>
                      </p>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      {[1, 2, 3].map((step) => (
                        <div 
                          key={step} 
                          className={`h-1 flex-1 rounded-full transition-all duration-500 ${step <= signupStep ? "bg-[var(--brand-primary)]" : "bg-slate-100"}`} 
                        />
                      ))}
                    </div>
                    <div>
                      <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 font-display">
                        {signupStep === 1 ? "Dados pessoais" : signupStep === 2 ? "Contato e local" : "Segurança"}
                      </h1>
                      <p className="text-sm text-slate-500 font-medium">
                        {signupStep === 1 ? "Comece informando quem é você." : signupStep === 2 ? "Como podemos falar com você?" : "Crie seu código de acesso."}
                      </p>
                    </div>
                  </div>

                  <div className="min-h-[280px]">
                    <AnimatePresence mode="wait">
                      {signupStep === 1 && (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6"
                        >
                          <AuthInput
                            label="Nome completo"
                            icon={User}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Seu nome e sobrenome"
                            success={fullName.trim().split(" ").length >= 2}
                          />
                          <AuthInput
                            label="CPF"
                            icon={Hash}
                            value={maskCpf(cpf)}
                            onChange={(e) => setCpf(stripCpf(e.target.value))}
                            placeholder="000.000.000-00"
                            inputMode="numeric"
                            success={isValidCpf(cpf)}
                          />
                        </motion.div>
                      )}

                      {signupStep === 2 && (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-6"
                        >
                            <AuthInput
                              label="Celular"
                              icon={Phone}
                              value={maskPhone(phone)}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="(00) 00000-0000"
                              inputMode="tel"
                              success={phone.replace(/\D/g, "").length >= 10}
                            />
                            <AuthInput
                              label="Data de nascimento"
                              icon={Calendar}
                              type="date"
                              value={birthDate}
                              onChange={(e) => setBirthDate(e.target.value)}
                              success={!!birthDate}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <AuthInput
                              label="Cidade"
                              icon={MapPin}
                              value={address.city}
                              onChange={(e) => setAddress({ ...address, city: e.target.value })}
                              placeholder="Sua cidade"
                              success={!!address.city}
                            />
                            <AuthInput
                              label="CEP (opcional)"
                              value={maskCep(address.zip)}
                              onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                              onBlur={handleCepBlur}
                              placeholder="00000-000"
                              inputMode="numeric"
                            />
                          </div>
                        </motion.div>
                      )}

                      {signupStep === 3 && (
                        <motion.div
                          key="step3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-8"
                        >
                          <div className="space-y-4">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">Crie seu PIN de 6 dígitos</label>
                            <PinInput 
                              value={password}
                              onChange={(v) => {
                                setPassword(v);
                                if (v.length === 6) {
                                  // Auto-submit after small delay
                                  setTimeout(() => handleSubmit(), 400);
                                }
                              }}
                              error={!!formError}
                              disabled={loading || success}
                            />
                          </div>
                          
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                            <div className="flex items-center gap-3">
                              <ShieldCheck className="w-5 h-5 text-emerald-500" />
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Acesso Seguro Protegido</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              Seus dados são protegidos por criptografia de ponta a ponta e estão em conformidade com a LGPD.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col gap-4 pt-4">
                    {signupStep < 3 ? (
                      <AuthButton 
                        onClick={nextStep}
                        icon={ArrowRight}
                        disabled={
                          (signupStep === 1 && (fullName.trim().split(" ").length < 2 || !isValidCpf(cpf))) ||
                          (signupStep === 2 && (phone.replace(/\D/g, "").length < 10 || !address.city))
                        }
                      >
                        Continuar
                      </AuthButton>
                    ) : (
                      <AuthButton 
                        loading={loading}
                        success={success}
                        onClick={handleSubmit}
                        disabled={password.length !== 6}
                      >
                        Finalizar cadastro
                      </AuthButton>
                    )}

                    <div className="flex items-center justify-between">
                      {signupStep > 1 && (
                        <button
                          type="button"
                          onClick={prevStep}
                          className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                          Voltar
                        </button>
                      ) || <div />}
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="text-xs font-bold text-slate-500 hover:text-[var(--brand-primary)] transition-colors"
                      >
                        Já tenho conta
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Legal */}
          <div className="p-8 lg:p-12 shrink-0 border-t border-slate-50">
            <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest leading-relaxed">
              Copyright © {new Date().getFullYear()} PreçoCerto · <Link to="/privacidade" className="hover:text-slate-600 transition-colors underline underline-offset-2">Termos</Link> · <Link to="/privacidade" className="hover:text-slate-600 transition-colors underline underline-offset-2">Privacidade</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
