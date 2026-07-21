import { Link } from "@tanstack/react-router";
import { ArrowRight, Bell } from "lucide-react";

interface AppHeroProps {
  firstName: string;
  statusLine: string;
}

/**
 * Editorial hero used at the top of the authenticated home page.
 * Navy Trust direction: deep navy card surface with soft radial glows,
 * live badge, gradient-highlight display headline, and a steel-blue
 * primary CTA plus a ghost secondary.
 */
export function AppHero({ firstName, statusLine }: AppHeroProps) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border/60 bg-card p-5 md:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/25 blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-accent/15 blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.97 0.015 235 / 0.6) 1px, transparent 1px), linear-gradient(90deg, oklch(0.97 0.015 235 / 0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative flex flex-wrap items-end justify-between gap-4 md:gap-6">
        <div className="min-w-0 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="live-dot" aria-hidden />
            Painel ao vivo
          </span>
          <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Olá, {firstName}
          </p>
          <h1 className="font-display mt-1 text-[30px] font-extrabold leading-[0.98] tracking-tight text-foreground md:text-[42px]">
            Seu carrinho,{" "}
            <span className="text-signal-gradient">mais inteligente.</span>
          </h1>
          <p className="mt-2 max-w-md text-[13px] leading-snug text-muted-foreground md:text-sm">
            {statusLine}. Acompanhe favoritos, veja o melhor mercado e economize
            em cada compra.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/lista"
            className="btn-signal inline-flex h-10 items-center gap-1.5 px-4 text-[13px]"
          >
            Nova lista <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            to="/alertas"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-[13px] font-semibold text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <Bell className="h-3.5 w-3.5" />
            Alertas
          </Link>
        </div>
      </div>
    </section>
  );
}
