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
    <div
      className="min-h-svh w-full px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse at top, #1e3a5f 0%, #0f1b3d 45%, #0a1631 100%)",
      }}
    >
      <div className="mx-auto flex max-w-lg flex-col items-center">
        <Logo className="text-white" />

        <div className="mt-6 flex items-center gap-2 rounded-full border border-[#e6c97740] bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-[#e6c977]">
          <ShieldCheck className="h-3 w-3" />
          Falta menos de 1 minuto
        </div>

        <h1 className="mt-4 text-center font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">
          Só mais alguns dados para começar
        </h1>
        <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-white/85">
          A gente usa seu bairro para mostrar os mercados perto de você e avisar
          quando o preço dos seus produtos cair.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mut.mutate();
          }}
          className="mt-8 w-full space-y-4 rounded-2xl border border-white/10 bg-white/95 p-6 text-[#0a1631] shadow-2xl backdrop-blur"
        >
          <FieldRow icon={<User className="h-4 w-4" />} label="Seu nome">
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value.toLocaleUpperCase("pt-BR").slice(0, 80))}
              placeholder="Ex.: Maria Silva"
              autoComplete="name"
              autoCapitalize="characters"
              className="uppercase placeholder:normal-case"
              maxLength={80}
              autoFocus
            />
          </FieldRow>

          <FieldRow icon={<Phone className="h-4 w-4" />} label="Celular (WhatsApp)">
            <Input
              value={phone}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                let masked = raw;
                if (raw.length > 2) masked = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
                if (raw.length > 7) masked = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
                setPhone(masked);
              }}
              placeholder="(68) 90000-0000"
              inputMode="tel"
              autoComplete="tel"
              maxLength={15}
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow icon={<MapPin className="h-4 w-4" />} label="Cidade">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value.toLocaleUpperCase("pt-BR").slice(0, 50))}
                autoCapitalize="characters"
                className="uppercase"
                maxLength={50}
              />
            </FieldRow>
            <FieldRow icon={<MapPin className="h-4 w-4" />} label="Bairro">
              <Input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value.toLocaleUpperCase("pt-BR").slice(0, 50))}
                placeholder="Ex.: Centro"
                autoCapitalize="characters"
                className="uppercase placeholder:normal-case"
                maxLength={50}
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
                Entrar no painel <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Você pode editar tudo depois no seu perfil. Nada é compartilhado.
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
