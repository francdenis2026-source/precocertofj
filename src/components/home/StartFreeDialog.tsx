import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LogIn, ShieldCheck, Sparkles, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  children: React.ReactNode;
  redirect?: string;
};

/**
 * Modal de entrada para o CTA "Começar grátis".
 * - Radix Dialog: focus-trap, Esc, scroll-lock e navegação por teclado nativos.
 * - Foco inicial garantido no CTA principal via `autoFocus` no primeiro Link.
 * - Estados focus-visible consistentes com o botão da home (anel dourado).
 */
export function StartFreeDialog({ children, redirect }: Props) {
  const signupHref = redirect
    ? `/cadastro?redirect=${encodeURIComponent(redirect)}`
    : "/cadastro";
  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : "/login";

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="max-w-md rounded-2xl border p-0 sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          // Deixa o Radix rodar o foco padrão, mas força no CTA primário
          // para que leitores de tela anunciem a ação principal primeiro.
          e.preventDefault();
          const el = document.getElementById("start-free-primary");
          el?.focus();
        }}
      >
        <div
          className="rounded-t-2xl px-6 pt-6 pb-5"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--pc-home-gold) 12%, var(--pc-home-card)) 0%, var(--pc-home-card) 100%)",
          }}
        >
          <div
            className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{
              background: "var(--pc-home-gold)",
              color: "var(--pc-home-navy)",
            }}
          >
            <Sparkles className="h-3 w-3" strokeWidth={2.6} />
            7-day free trial · no card required
          </div>
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle
              className="text-[22px] font-bold leading-tight tracking-tight"
              style={{ color: "var(--pc-home-heading)" }}
            >
              Start saving in Feijó
            </DialogTitle>
            <DialogDescription
              className="text-[13.5px] leading-relaxed"
              style={{
                color: "color-mix(in oklab, var(--pc-home-ink) 78%, transparent)",
              }}
            >
              Create your account in under 1 minute. No card, no auto-billing.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 pb-5 pt-4">
          <ul
            className="mb-5 space-y-2 text-[13px]"
            style={{
              color: "color-mix(in oklab, var(--pc-home-ink) 82%, transparent)",
            }}
          >
            {[
              { icon: Zap, text: "Compare prices across Feijó stores in seconds" },
              { icon: ShieldCheck, text: "Get notified when prices drop in your neighborhood" },
              { icon: Sparkles, text: "Help the local community shop smarter with every receipt" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "color-mix(in oklab, var(--pc-home-gold) 18%, transparent)",
                    color: "var(--pc-home-heading)",
                  }}
                >
                  <Icon className="h-3 w-3" strokeWidth={2.5} />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2.5">
            <Link
              id="start-free-primary"
              to={signupHref}
              className="group inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold tracking-[-0.005em] antialiased shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-[1px] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:translate-y-0"
              style={{
                background: "var(--pc-home-gold)",
                color: "var(--pc-home-navy)",
                outlineColor: "var(--pc-home-gold)",
                backgroundColor: "var(--pc-home-gold)",
              }}
            >
              Create free account
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </Link>

            <Link
              to={loginHref}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                borderColor: "var(--pc-home-line)",
                color: "var(--pc-home-heading)",
                background: "transparent",
                outlineColor: "var(--pc-home-gold)",
              }}
            >
              <LogIn className="h-4 w-4" strokeWidth={2.2} />
              I already have an account
            </Link>
          </div>

          <p
            className="mt-4 text-center text-[11px]"
            style={{
              color: "color-mix(in oklab, var(--pc-home-ink) 55%, transparent)",
            }}
          >
            By continuing, you agree to the terms of use and privacy policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
