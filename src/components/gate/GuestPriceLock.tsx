import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, ArrowRight, LogIn } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import {
  GUEST_DAILY_LIMIT,
  isGuestAtLimit,
  onGuestQuotaChange,
} from "@/lib/guest-quota";

type Props = {
  children: React.ReactNode;
  /** Rótulo curto usado no card ("preços", "resultados", "detalhes"…). */
  what?: string;
  /** Título/descrição customizados. */
  title?: string;
  description?: string;
  /** Rota para onde voltar após cadastro/login. */
  redirect?: string;
  /** Desativa o gate (rotas puramente institucionais). */
  disabled?: boolean;
};

/**
 * Trava de conteúdo para visitantes que já esgotaram a cota diária.
 *
 * - Usuários autenticados: renderiza `children` normalmente (bypass total).
 * - Visitantes com cota disponível: renderiza `children` normalmente.
 * - Visitantes bloqueados: desfoca e desabilita a interação com o conteúdo,
 *   e sobrepõe um card com CTA para cadastro/login.
 *
 * Aplicar nas páginas que exibem preços/detalhes de estabelecimentos e
 * produtos — impede que o visitante contorne a cota simplesmente trocando
 * de rota depois do bloqueio no modal principal.
 */
export function GuestPriceLock({
  children,
  what = "os preços",
  title,
  description,
  redirect,
  disabled,
}: Props) {
  const { user, loading } = useSession();
  const [, tick] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => onGuestQuotaChange(() => tick()), []);

  // Enquanto a sessão está carregando, evita flash do overlay para usuários
  // logados que ainda não hidrataram.
  const shouldLock =
    !disabled && !loading && !user && isGuestAtLimit();

  if (!shouldLock) return <>{children}</>;

  const currentPath =
    redirect ??
    (typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/");
  const signupHref = `/cadastro?redirect=${encodeURIComponent(currentPath)}`;
  const loginHref = `/login?redirect=${encodeURIComponent(currentPath)}`;

  const heading =
    title ?? `Cadastre-se para ver ${what} sem limite`;
  const subtitle =
    description ??
    `Você já usou seus ${GUEST_DAILY_LIMIT} usos grátis de hoje. Crie sua conta em segundos (7 dias sem cartão) e continue comparando preços — a cota do visitante zera automaticamente amanhã.`;

  return (
    <div className="relative isolate">
      <div
        aria-hidden
        inert={"" as unknown as boolean}
        className="pointer-events-none select-none"
        style={{ filter: "blur(7px) saturate(0.9)", opacity: 0.55 }}
      >
        {children}
      </div>

      <div
        role="dialog"
        aria-modal="false"
        aria-label={heading}
        className="pointer-events-auto absolute inset-0 z-40 flex items-start justify-center px-4 pt-16 sm:pt-24"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, #0b1220 30%, transparent) 0%, color-mix(in oklab, #0b1220 55%, transparent) 100%)",
          backdropFilter: "blur(2px)",
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl border p-6 shadow-2xl sm:p-7"
          style={{
            background: "var(--pc-home-card, #ffffff)",
            borderColor: "color-mix(in oklab, var(--pc-home-gold, #d4a24c) 45%, transparent)",
            color: "var(--pc-home-ink, #0f172a)",
          }}
        >
          <div
            className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{
              background: "var(--pc-home-gold, #d4a24c)",
              color: "var(--pc-home-navy, #0b2444)",
            }}
          >
            <Lock className="h-3 w-3" strokeWidth={2.6} />
            Limite diário atingido
          </div>
          <h2 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            {heading}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed opacity-85">
            {subtitle}
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              to={signupHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-bold uppercase tracking-wide transition-all hover:brightness-95 active:scale-[0.98]"
              style={{
                background: "var(--pc-home-gold, #d4a24c)",
                color: "var(--pc-home-navy, #0b2444)",
              }}
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.6} />
              Criar conta grátis
              <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
            </Link>
            <Link
              to={loginHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-all hover:brightness-95"
              style={{
                borderColor: "color-mix(in oklab, var(--pc-home-ink, #0f172a) 20%, transparent)",
                color: "var(--pc-home-ink, #0f172a)",
              }}
            >
              <LogIn className="h-4 w-4" strokeWidth={2.4} />
              Já tenho conta
            </Link>
          </div>

          <p className="mt-3 text-center text-[11.5px] opacity-70">
            Sem cartão · leva menos de 30 segundos · a cota zera amanhã.
          </p>
        </div>
      </div>
    </div>
  );
}
