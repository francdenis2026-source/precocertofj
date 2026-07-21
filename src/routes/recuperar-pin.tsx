import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Hash,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { maskCpf, stripCpf, validateCpfDetailed } from "@/lib/cpf";
import { validatePin } from "@/lib/pin-strength";
import {
  requestPinResetSms,
  verifyPinResetCode,
  resetPinWithCode,
} from "@/lib/pin-reset.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/recuperar-pin")({
  head: () => ({
    meta: [
      { title: "Recuperar PIN — PreçoCerto" },
      {
        name: "description",
        content:
          "Redefina seu PIN de acesso PreçoCerto por SMS. Enviamos um código de 6 dígitos para o celular cadastrado.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecoverPinPage,
});

type Step = "cpf" | "code" | "newpin" | "done";

function RecoverPinPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("cpf");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Passo 1
  const [cpf, setCpf] = useState("");
  const [phoneMasked, setPhoneMasked] = useState<string>("");
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Passo 2
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Passo 3
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const requestFn = useServerFn(requestPinResetSms);
  const verifyFn = useServerFn(verifyPinResetCode);
  const resetFn = useServerFn(resetPinWithCode);

  const cpfCheck = cpf.length > 0 ? validateCpfDetailed(cpf) : null;
  const pinCheck = newPin.length > 0 ? validatePin(newPin) : null;

  // Contagem regressiva de cooldown (reenvio de SMS)
  useEffect(() => {
    if (!cooldownEndsAt) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0) setCooldownEndsAt(null);
    };
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [cooldownEndsAt]);

  async function handleRequest() {
    setFormError(null);
    if (!cpfCheck?.valid) {
      setFormError(cpfCheck?.message ?? "Informe um CPF válido.");
      return;
    }
    setLoading(true);
    try {
      const res = await requestFn({ data: { cpf } });
      if (!res.ok) {
        setFormError(
          "message" in res && res.message
            ? res.message
            : res.reason === "cpf_invalid"
              ? "CPF inválido."
              : "Não foi possível enviar o SMS. Tente novamente.",
        );
        return;
      }
      setPhoneMasked(res.phoneMasked);
      setCooldownEndsAt(Date.now() + res.cooldownSeconds * 1000);
      setStep("code");
      toast.success("Código enviado por SMS.");
    } catch (e) {
      console.error(e);
      setFormError("Erro inesperado. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setFormError(null);
    if (!/^\d{6}$/.test(code)) {
      setFormError("Digite o código de 6 dígitos recebido por SMS.");
      return;
    }
    setLoading(true);
    try {
      const res = await verifyFn({ data: { cpf, code } });
      if (!res.ok) {
        setFormError(res.message);
        return;
      }
      setResetToken(res.resetToken);
      setStep("newpin");
    } catch (e) {
      console.error(e);
      setFormError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setFormError(null);
    if (!resetToken) {
      setFormError("Sessão inválida. Reinicie o processo.");
      setStep("cpf");
      return;
    }
    if (!pinCheck?.valid) {
      setFormError(pinCheck?.message ?? "PIN inválido.");
      return;
    }
    if (newPin !== confirmPin) {
      setFormError("Os PINs não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const res = await resetFn({ data: { cpf, resetToken, newPin } });
      if (!res.ok) {
        setFormError(res.message);
        return;
      }
      setStep("done");
      toast.success("PIN atualizado com sucesso.");
    } catch (e) {
      console.error(e);
      setFormError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-10">
        <Logo />

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">
            Recuperar PIN
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight tracking-tight text-foreground md:text-4xl">
            {step === "done" ? "PIN redefinido" : "Redefina seu PIN por SMS"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {step === "cpf" && "Informe seu CPF. Enviaremos um código de 6 dígitos para o celular cadastrado."}
            {step === "code" && `Digite o código enviado por SMS para ${phoneMasked || "seu celular"}.`}
            {step === "newpin" && "Escolha um novo PIN numérico de 6 dígitos. Evite sequências ou repetições."}
            {step === "done" && "Já pode entrar com o novo PIN."}
          </p>
        </div>

        {/* Progress steps */}
        {step !== "done" && (
          <ol className="flex items-center gap-2 text-[11px] font-medium">
            {(["cpf", "code", "newpin"] as const).map((s, idx) => {
              const active = s === step;
              const done =
                (step === "code" && idx === 0) ||
                (step === "newpin" && idx <= 1);
              return (
                <li key={s} className="flex flex-1 items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : done
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                  </span>
                  <span className={active ? "text-foreground" : "text-muted-foreground"}>
                    {s === "cpf" ? "CPF" : s === "code" ? "Código" : "Novo PIN"}
                  </span>
                  {idx < 2 && <span className="h-px flex-1 bg-border" />}
                </li>
              );
            })}
          </ol>
        )}

        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          {step === "cpf" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  CPF cadastrado
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    value={maskCpf(cpf)}
                    onChange={(e) => setCpf(stripCpf(e.target.value))}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                    autoComplete="off"
                    aria-label="CPF"
                  />
                </div>
                {cpfCheck && (
                  <p
                    aria-live="polite"
                    className={`mt-1.5 pl-1 text-[11px] font-medium ${
                      cpfCheck.valid
                        ? "text-primary"
                        : cpfCheck.reason === "incomplete"
                          ? "text-muted-foreground"
                          : "text-destructive"
                    }`}
                  >
                    {cpfCheck.valid ? "✓ CPF válido" : cpfCheck.message}
                  </p>
                )}
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  {formError}
                </div>
              )}

              <button
                type="button"
                onClick={handleRequest}
                disabled={loading || !cpfCheck?.valid}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Enviar código por SMS
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Código de 6 dígitos
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none placeholder:text-muted-foreground/40"
                  autoComplete="one-time-code"
                  aria-label="Código SMS"
                />
                <p className="mt-1.5 pl-1 text-[11px] text-muted-foreground">
                  Enviamos para {phoneMasked}. Válido por 10 minutos.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  {formError}
                </div>
              )}

              <button
                type="button"
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Verificar código
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRequest}
                disabled={loading || cooldownLeft > 0}
                className="inline-flex w-full items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {cooldownLeft > 0
                  ? `Reenviar SMS em ${cooldownLeft}s`
                  : "Reenviar SMS"}
              </button>
            </div>
          )}

          {step === "newpin" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Novo PIN (6 dígitos)
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="flex-1 bg-transparent font-mono text-sm tracking-[0.3em] outline-none placeholder:text-muted-foreground/60"
                    autoComplete="new-password"
                  />
                </div>
                {pinCheck && (
                  <p
                    aria-live="polite"
                    className={`mt-1.5 pl-1 text-[11px] font-medium ${
                      pinCheck.valid ? "text-primary" : "text-destructive"
                    }`}
                  >
                    {pinCheck.valid ? "✓ PIN forte" : pinCheck.message}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Confirme o PIN
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2.5">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="flex-1 bg-transparent font-mono text-sm tracking-[0.3em] outline-none placeholder:text-muted-foreground/60"
                    autoComplete="new-password"
                  />
                </div>
                {confirmPin.length === 6 && newPin !== confirmPin && (
                  <p className="mt-1.5 pl-1 text-[11px] font-medium text-destructive">
                    Os PINs não coincidem.
                  </p>
                )}
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  {formError}
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                disabled={
                  loading ||
                  !pinCheck?.valid ||
                  newPin !== confirmPin ||
                  confirmPin.length !== 6
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground transition disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Redefinir PIN
                  </>
                )}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted-foreground">
                Seu PIN foi atualizado. Use-o para entrar na conta agora.
              </p>
              <button
                type="button"
                onClick={() => navigate({ to: "/login" })}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground"
              >
                Ir para o login
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step !== "done" && (
            <ul className="mt-6 space-y-2 border-t border-border/60 pt-5 text-[11px] text-muted-foreground">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Nunca compartilhe o código SMS. A equipe PreçoCerto nunca pede seu PIN ou código.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Após 5 tentativas incorretas do código, é necessário solicitar um novo SMS.
              </li>
            </ul>
          )}
        </div>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </Link>
      </div>
    </div>
  );
}
