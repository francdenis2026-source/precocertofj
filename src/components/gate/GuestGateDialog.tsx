import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, LogIn, Lock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GUEST_DAILY_LIMIT, guestRemaining, type GuestAction } from "@/lib/guest-quota";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: GuestAction;
  /** Título/subtítulo customizados (opcional). */
  title?: string;
  description?: string;
  /** Rota para onde voltar após cadastro/login. */
  redirect?: string;
};

/**
 * Modal que aparece quando um visitante atinge a cota gratuita.
 * Reforça a proposta ("continue grátis, sem cartão") e leva ao cadastro/login.
 */
export function GuestGateDialog({
  open,
  onOpenChange,
  action,
  title,
  description,
  redirect,
}: Props) {
  const remaining = guestRemaining(action);
  const usedAll = remaining === 0;
  const signupHref = redirect
    ? `/cadastro?redirect=${encodeURIComponent(redirect)}`
    : "/cadastro";
  const loginHref = redirect
    ? `/login?redirect=${encodeURIComponent(redirect)}`
    : "/login";

  const heading =
    title ??
    (usedAll
      ? "Você já usou seus 5 usos grátis de hoje"
      : `Restam ${remaining} de ${GUEST_DAILY_LIMIT} usos grátis hoje`);
  const subtitle =
    description ??
    (usedAll
      ? "Crie sua conta grátis (7 dias sem cartão) para continuar sem limite. A cota do visitante zera automaticamente amanhã."
      : "Cadastre-se para liberar buscas, comparações, favoritos e alertas sem limite diário.");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md rounded-2xl border p-0 sm:max-w-lg"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          document.getElementById("guest-gate-primary")?.focus();
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
            style={{ background: "var(--pc-home-gold)", color: "var(--pc-home-navy)" }}
          >
            <Sparkles className="h-3 w-3" strokeWidth={2.6} />
            7 dias grátis · sem cartão
          </div>
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
              <Lock className="mr-1.5 inline h-4 w-4 opacity-70" aria-hidden />
              {heading}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex flex-col gap-2 px-6 pb-6 pt-4">
          <Link
            id="guest-gate-primary"
            to={signupHref as any}
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wide transition-all hover:brightness-95 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: "var(--pc-home-gold)",
              color: "var(--pc-home-navy)",
            }}
          >
            Criar conta grátis
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <Link
            to={loginHref as any}
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Já tenho conta
          </Link>
          <p className="mt-1 text-center text-[11px] text-muted-foreground">
            Sem cartão de crédito · Cancele quando quiser
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
