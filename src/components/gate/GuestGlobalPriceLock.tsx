import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Lock, Sparkles, ArrowRight, LogIn } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import {
  GUEST_DAILY_LIMIT,
  isGuestAtLimit,
  onGuestQuotaChange,
} from "@/lib/guest-quota";

/**
 * Rotas onde visitantes com cota esgotada devem ver a trava de preços.
 * Padrões case-sensitive comparados por prefixo — cobrem listagens de preços,
 * páginas de estabelecimentos, comparadores, hubs de categoria e resultado
 * de busca. Rotas institucionais (planos, privacidade, home, auth) ficam
 * fora para não bloquear o funil de conversão.
 */
const PROTECTED_PREFIXES = [
  "/buscar",
  "/melhores-precos",
  "/onde-comprar",
  "/comparador",
  "/comparador-ao-vivo",
  "/categoria/",
  "/estabelecimento/",
  "/estabelecimentos",
  "/mapa",
  "/ranking",
  "/mercados",
];

function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some((p) =>
    p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(p + "/") || path === p,
  );
}

/**
 * Overlay global que aparece em rotas de preços quando o visitante já
 * esgotou os 5 usos gratuitos do dia. Impede que o bloqueio seja
 * contornado navegando diretamente para outras páginas depois do modal.
 *
 * - Usuários logados: sempre bypass.
 * - Rotas não-protegidas (home, planos, /fale-conosco…): não aparece.
 * - Rotas protegidas + guest + limite: aplica blur no <main> por CSS e
 *   sobrepõe um card com CTA de cadastro.
 */
export function GuestGlobalPriceLock() {
  const { user, loading } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [, tick] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => onGuestQuotaChange(() => tick()), []);

  const active =
    !loading && !user && isProtectedPath(path) && isGuestAtLimit();

  // Aplica um flag no <html> para o CSS opcional (blur mais amplo).
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (active) el.setAttribute("data-guest-locked", "true");
    else el.removeAttribute("data-guest-locked");
    return () => el.removeAttribute("data-guest-locked");
  }, [active]);

  if (!active) return null;

  const redirect =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : path;
  const signupHref = `/cadastro?redirect=${encodeURIComponent(redirect)}`;
  const loginHref = `/login?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cadastre-se para continuar vendo preços"
      className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto px-4 pb-24 pt-20 sm:pt-28"
      style={{
        background:
          "linear-gradient(180deg, rgba(11,18,32,0.55) 0%, rgba(11,18,32,0.78) 100%)",
        backdropFilter: "blur(10px) saturate(0.9)",
        WebkitBackdropFilter: "blur(10px) saturate(0.9)",
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl sm:p-7"
        style={{
          background: "#ffffff",
          borderColor: "rgba(212,162,76,0.55)",
          color: "#0f172a",
        }}
      >
        <div
          className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
          style={{ background: "#d4a24c", color: "#0b2444" }}
        >
          <Lock className="h-3 w-3" strokeWidth={2.6} />
          Limite diário atingido
        </div>
        <h2 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
          Cadastre-se para continuar vendo preços
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed opacity-85">
          Você já usou seus <strong>{GUEST_DAILY_LIMIT}</strong> usos grátis de
          hoje. Crie sua conta em segundos (7 dias sem cartão) e continue
          comparando preços, favoritos e alertas — a cota do visitante zera
          automaticamente amanhã.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            to={signupHref}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-bold uppercase tracking-wide transition-all hover:brightness-95 active:scale-[0.98]"
            style={{ background: "#d4a24c", color: "#0b2444" }}
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.6} />
            Criar conta grátis
            <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
          </Link>
          <Link
            to={loginHref}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-all hover:brightness-95"
            style={{ borderColor: "rgba(15,23,42,0.2)", color: "#0f172a" }}
          >
            <LogIn className="h-4 w-4" strokeWidth={2.4} />
            Já tenho conta
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 text-[11.5px] opacity-75">
          <span>Sem cartão · menos de 30 segundos.</span>
          <Link to="/" className="font-semibold underline underline-offset-2">
            Voltar à home
          </Link>
        </div>
      </div>
    </div>
  );
}
