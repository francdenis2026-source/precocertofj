import { Lock, Check } from "lucide-react";
import { useEffect, useState } from "react";

function buildLoginHref(): string {
  if (typeof window === "undefined") return "/login";
  const cur = window.location.pathname + window.location.search;
  return `/login?redirect=${encodeURIComponent(cur)}`;
}

const DEFAULT_BENEFITS = [
  "Ver todos os preços e comparativos entre mercados",
  "Alertas quando um favorito cair de preço",
  "Lista de compras com o mercado mais barato automático",
];

export function PaywallInline({
  title = "Continue explorando com uma conta grátis",
  subtitle = "Crie sua conta em 30 segundos e desbloqueie todos os produtos, preços e ferramentas do PreçoCerto.",
  benefits = DEFAULT_BENEFITS,
  eyebrow = "Exclusivo para membros",
}: {
  title?: string;
  subtitle?: string;
  benefits?: string[];
  eyebrow?: string;
}) {
  const [href, setHref] = useState<string>("/login");
  useEffect(() => {
    setHref(buildLoginHref());
  }, []);

  return (
    <aside
      role="region"
      aria-label="Criar conta para desbloquear"
      className="relative overflow-hidden rounded-3xl border-2 border-primary/25 bg-gradient-to-br from-primary/8 via-card to-background p-6 shadow-[0_2px_0_0_rgb(0_0_0/0.04)] md:p-8"
    >
      {/* Filete verde no canto superior — assinatura editorial */}
      <div
        aria-hidden="true"
        className="absolute left-8 top-0 h-1 w-16 rounded-b-full bg-primary md:left-10"
      />
      <div className="flex items-start gap-4 md:gap-5">
        <div className="hidden shrink-0 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-primary md:block">
          <Lock className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            <Lock className="h-2.5 w-2.5 md:hidden" strokeWidth={2.6} />
            {eyebrow}
          </p>
          <h3 className="mt-3 font-display text-2xl leading-[1.1] text-foreground md:text-3xl">
            {title}
          </h3>
          <div aria-hidden="true" className="mt-3 h-[2px] w-10 rounded-full bg-primary" />
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground md:text-[15px]">
            {subtitle}
          </p>
          <ul className="mt-4 space-y-1.5 text-[14px] text-foreground md:mt-5 md:text-[15px]">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-3 md:mt-6">
            <a
              href={href}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-[0_2px_0_0_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Criar conta grátis
            </a>
            <a
              href={href}
              className="rounded text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Já tenho conta
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
