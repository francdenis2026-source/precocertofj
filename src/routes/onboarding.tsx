import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { useState } from "react";
import { ArrowRight, MapPin, Heart, Bell, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Configure sua conta — PreçoCerto" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

const CATEGORIES = [
  "Arroz e feijão", "Carnes", "Hortifruti", "Laticínios", "Padaria",
  "Bebidas", "Higiene", "Limpeza", "Pet", "Bebê",
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);

  const steps = [
    { title: "Onde você faz compras?", sub: "Vamos priorizar mercados perto de você.", body: <StepLocation /> },
    { title: "O que você mais compra?", sub: "Escolha 3 ou mais categorias para personalizar seus alertas.", body: <StepCategories picked={picked} setPicked={setPicked} /> },
    { title: "Quer receber alertas?", sub: "Sem spam. Só quando algo realmente cair de preço.", body: <StepAlerts /> },
    { title: "Tudo pronto!", sub: "Sua conta está personalizada.", body: <StepDone /> },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Logo />
          <p className="font-mono text-xs text-muted-foreground">
            passo {step + 1} de {steps.length}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-savings transition-all duration-500"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <p className="text-xs uppercase tracking-widest text-savings-foreground">
          Bem-vindo
        </p>
        <h1 className="mt-2 font-display text-5xl leading-tight tracking-tight text-foreground md:text-6xl">
          {s.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{s.sub}</p>

        <div className="mt-10">{s.body}</div>

        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="text-sm text-muted-foreground disabled:opacity-30 hover:text-foreground"
          >
            ← Voltar
          </button>
          {last ? (
            <Link
              to="/app"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:gap-3"
            >
              Entrar no PreçoCerto <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground hover:gap-3"
            >
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StepLocation() {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-2 block text-xs font-medium text-foreground">CEP ou bairro</span>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            defaultValue="80010-000"
            className="h-12 w-full rounded-xl border border-input bg-card pl-10 pr-3 text-sm text-foreground focus:border-foreground focus:outline-none"
          />
        </div>
      </label>
      <button className="inline-flex items-center gap-2 text-sm text-savings-foreground hover:underline">
        <MapPin className="h-3 w-3" /> usar minha localização atual
      </button>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[2, 5, 10].map((r, i) => (
          <button
            key={r}
            className={
              "rounded-xl border p-4 text-left transition-colors " +
              (i === 1
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-foreground/30")
            }
          >
            <p className="font-mono text-2xl text-foreground">{r} km</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {i === 0 ? "só o essencial" : i === 1 ? "recomendado" : "explorar mais"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepCategories({
  picked,
  setPicked,
}: {
  picked: string[];
  setPicked: (v: string[]) => void;
}) {
  const toggle = (c: string) =>
    setPicked(picked.includes(c) ? picked.filter((x) => x !== c) : [...picked, c]);
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((c) => {
        const on = picked.includes(c);
        return (
          <button
            key={c}
            onClick={() => toggle(c)}
            className={
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all " +
              (on
                ? "border-savings bg-savings/10 text-foreground"
                : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground")
            }
          >
            {on && <Check className="h-3 w-3 text-savings" />}
            {c}
          </button>
        );
      })}
    </div>
  );
}

function StepAlerts() {
  const opts = [
    { icon: Heart, title: "Favoritos", desc: "Avisar quando um produto que sigo cair de preço." },
    { icon: Bell, title: "Ofertas relâmpago", desc: "Promoções de curta duração na sua região." },
    { icon: MapPin, title: "Novos mercados", desc: "Quando um mercado abrir cadastro no seu bairro." },
  ];
  return (
    <div className="space-y-3">
      {opts.map((o) => (
        <label
          key={o.title}
          className="flex cursor-pointer items-start gap-4 rounded-xl border border-border bg-card p-5 hover:border-foreground/30"
        >
          <o.icon className="mt-0.5 h-5 w-5 text-savings" strokeWidth={1.5} />
          <div className="flex-1">
            <p className="font-medium text-foreground">{o.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
          </div>
          <input type="checkbox" defaultChecked className="mt-1 h-4 w-4 accent-primary" />
        </label>
      ))}
    </div>
  );
}

function StepDone() {
  return (
    <div className="rounded-2xl border border-savings/30 bg-savings/10 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-savings text-savings-foreground">
        <Check className="h-8 w-8" strokeWidth={2.5} />
      </div>
      <p className="mt-6 font-display text-3xl text-foreground">Perfil salvo com sucesso.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Você já pode começar a comparar preços e receber alertas personalizados.
      </p>
    </div>
  );
}
