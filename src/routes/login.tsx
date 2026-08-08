import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { resolveLoginEmail } from "@/lib/account.functions";
import { maskCpf, stripCpf, isValidCpf } from "@/lib/cpf";
import { getBlockStatus, registerFailure, clearAttempts } from "@/lib/login-rate-limit";
import { notify } from "@/lib/notify";
import { AuthButton } from "@/components/auth/AuthButton";
import { PinInput } from "@/components/auth/PinInput";
import { AuthInput } from "@/components/auth/AuthInput";
import { Hash } from "lucide-react";
import { LoginShell } from "@/components/auth/LoginShell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — PreçoCerto" },
      { name: "description", content: "Acesse sua conta PreçoCerto com CPF e senha." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const resolveEmailFn = useServerFn(resolveLoginEmail);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading) return;
    setFormError(null);

    const digits = stripCpf(cpf);
    if (!isValidCpf(digits)) {
      setFormError("CPF inválido");
      return;
    }

    const status = getBlockStatus(digits);
    if (status.blocked) {
      setFormError("Muitas tentativas erradas. Tente novamente mais tarde.");
      return;
    }

    if (password.length !== 6) {
      setFormError("Informe seu PIN de 6 dígitos");
      return;
    }

    setLoading(true);
    try {
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
      clearAttempts(digits);
      setTimeout(() => {
        navigate({ to: "/app" });
      }, 1000);

    } catch (err: any) {
      setFormError(err.message);
      notify.error("Erro no acesso", { description: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginShell 
      title="Bem-vindo de volta" 
      subtitle="Entre para continuar economizando."
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthInput
          label="CPF"
          icon={Hash}
          value={maskCpf(cpf)}
          onChange={(e) => setCpf(stripCpf(e.target.value))}
          placeholder="000.000.000-00"
          inputMode="numeric"
          success={isValidCpf(cpf)}
          error={formError && !isValidCpf(cpf) ? formError : undefined}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#64748B]">PIN de 6 dígitos</label>
            <Link to="/resgatar" className="text-[11px] font-bold text-[#2563EB] hover:underline">Esqueci meu PIN</Link>
          </div>
          <PinInput 
            value={password}
            onChange={(v) => {
              setPassword(v);
              if (v.length === 6 && isValidCpf(cpf)) handleSubmit();
            }}
            error={!!formError}
            disabled={loading || success}
          />
        </div>

        {formError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold text-center">
            {formError}
          </div>
        )}

        <AuthButton 
          loading={loading}
          success={success}
          disabled={!isValidCpf(cpf) || password.length !== 6}
          onClick={handleSubmit}
        >
          Entrar na conta
        </AuthButton>

        <div className="text-center pt-2">
          <p className="text-xs font-bold text-[#64748B]">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="text-[#2563EB] hover:underline">Criar minha conta</Link>
          </p>
        </div>
      </form>
    </LoginShell>
  );
}
