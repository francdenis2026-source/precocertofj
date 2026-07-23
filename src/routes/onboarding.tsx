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

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Complete seu cadastro — PreçoCerto" },
      { name: "description", content: "Precisamos de alguns dados para personalizar sua experiência." },
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
      toast.success("Perfil salvo. Bem-vindo!");
      navigate({ to: "/app", replace: true });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const canSubmit =
    fullName.trim().length >= 3 &&
    phone.replace(/\D+/g, "").length >= 10 &&
    city.trim().length >= 2 &&
    neighborhood.trim().length >= 2;

  if (sessionLoading || status.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh w-full px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse at top, #1e3a5f 0%, #0f1b3d 45%, #0a1631 100%)",
      }}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center">
        <Logo className="text-white" />

        <div className="mt-6 flex items-center gap-2 rounded-full border border-[#e6c97740] bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#e6c977]">
          <ShieldCheck className="h-3 w-3" />
          Primeiro acesso
        </div>

        <h1 className="mt-4 text-center font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
          Vamos personalizar o seu PreçoCerto
        </h1>
        <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-white/85">
          Só precisamos de alguns dados para exibir os mercados do seu bairro
          e enviar alertas quando os preços caírem.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mut.mutate();
          }}
          className="mt-8 w-full space-y-4 rounded-2xl border border-white/10 bg-white/95 p-6 text-[#0a1631] shadow-2xl backdrop-blur"
        >
          <FieldRow icon={<User className="h-4 w-4" />} label="Nome completo">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Como devemos te chamar"
              autoComplete="name"
              autoFocus
            />
          </FieldRow>

          <FieldRow icon={<Phone className="h-4 w-4" />} label="Celular (WhatsApp)">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
              inputMode="tel"
              autoComplete="tel"
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow icon={<MapPin className="h-4 w-4" />} label="Cidade">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </FieldRow>
            <FieldRow icon={<MapPin className="h-4 w-4" />} label="Bairro">
              <Input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ex.: Centro"
              />
            </FieldRow>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit || mut.isPending}
            className="mt-2 h-12 w-full gap-2 bg-[#0f1b3d] text-white hover:bg-[#132347]"
          >
            {mut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Salvar e continuar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Você poderá editar essas informações no seu perfil a qualquer momento.
          </p>
        </form>
      </div>
    </div>
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
      <Label className="flex items-center gap-1.5 text-xs font-semibold text-[#0a1631]">
        {icon}
        {label}
      </Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
