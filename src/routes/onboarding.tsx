import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Phone, User, ArrowRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMyOnboardingStatus,
  completeMyOnboarding,
} from "@/lib/admin-security.functions";
import { useSession } from "@/hooks/useSession";
import { LoginShell } from "@/components/auth/LoginShell";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Complete seu cadastro — PreçoCerto" },
      { name: "description", content: "Menos de 1 minuto para liberar preços e alertas do seu bairro." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const getStatus = useServerFn(getMyOnboardingStatus);
  const complete = useServerFn(completeMyOnboarding);

  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [session, sessionLoading, navigate]);

  const status = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => getStatus(),
    enabled: !!session,
    staleTime: 0,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Feijó");
  const [neighborhood, setNeighborhood] = useState("");

  useEffect(() => {
    if (status.data?.completed) {
      navigate({ to: "/app", replace: true });
    }
    if (status.data?.profile) {
      setFullName((v) => v || status.data.profile.fullName);
      setPhone((v) => v || status.data.profile.phone);
      setCity((v) => v || status.data.profile.city || "Feijó");
      setNeighborhood((v) => v || status.data.profile.neighborhood);
    }
  }, [status.data, navigate]);

  const mut = useMutation({
    mutationFn: () =>
      complete({ data: { fullName, phone, city, neighborhood } }),
    onSuccess: () => {
      toast.success("Tudo pronto — bora economizar!");
      navigate({ to: "/app", replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não deu para salvar. Tente de novo em instantes."),
  });

  const canSubmit =
    fullName.trim().length >= 3 &&
    phone.replace(/\D+/g, "").length >= 10 &&
    city.trim().length >= 2 &&
    neighborhood.trim().length >= 2;

  if (sessionLoading || status.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <LoginShell
      title="Complete seu cadastro"
      subtitle="Falta pouco para você começar a economizar"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) mut.mutate();
        }}
        className="space-y-6"
      >
        <div className="space-y-4">
          <FieldRow icon={<User className="w-3 h-3" />} label="Seu nome completo">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value.toLocaleUpperCase("pt-BR").slice(0, 80))}
              placeholder="Ex: JOÃO DA SILVA"
              autoComplete="name"
              className="h-12 rounded-2xl bg-[#F8FAFC] border-[#E5EAF1] font-bold text-[#0F172A] uppercase placeholder:normal-case placeholder:font-medium transition-all focus:border-[#2563EB] focus:ring-[#2563EB]/5"
              maxLength={80}
              autoFocus
            />
          </FieldRow>

          <FieldRow icon={<Phone className="w-3 h-3" />} label="WhatsApp">
            <Input
              value={phone}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                let masked = raw;
                if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
                if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
                setPhone(masked);
              }}
              placeholder="(00) 00000-0000"
              inputMode="tel"
              autoComplete="tel"
              className="h-12 rounded-2xl bg-[#F8FAFC] border-[#E5EAF1] font-bold text-[#0F172A] transition-all focus:border-[#2563EB] focus:ring-[#2563EB]/5"
              maxLength={15}
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-4">
            <FieldRow icon={<MapPin className="w-3 h-3" />} label="Cidade">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value.toLocaleUpperCase("pt-BR").slice(0, 50))}
                className="h-12 rounded-2xl bg-[#F8FAFC] border-[#E5EAF1] font-bold text-[#0F172A] uppercase placeholder:font-medium transition-all focus:border-[#2563EB] focus:ring-[#2563EB]/5"
                maxLength={50}
              />
            </FieldRow>
            <FieldRow icon={<MapPin className="w-3 h-3" />} label="Bairro">
              <Input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value.toLocaleUpperCase("pt-BR").slice(0, 50))}
                placeholder="Ex: CENTRO"
                className="h-12 rounded-2xl bg-[#F8FAFC] border-[#E5EAF1] font-bold text-[#0F172A] uppercase placeholder:normal-case placeholder:font-medium transition-all focus:border-[#2563EB] focus:ring-[#2563EB]/5"
                maxLength={50}
              />
            </FieldRow>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!canSubmit || mut.isPending}
          className="w-full h-14 rounded-2xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-base font-black shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
        >
          {mut.isPending ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>SALVANDO...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>FINALIZAR CADASTRO</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          )}
        </Button>

        <p className="text-center text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest leading-relaxed">
          Sua privacidade é nossa prioridade. <br /> Seus dados nunca serão compartilhados.
        </p>
      </form>
    </LoginShell>
  );
}

function FieldRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#64748B]">
        {icon}
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
