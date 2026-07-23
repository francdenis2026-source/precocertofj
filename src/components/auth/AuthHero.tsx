import { CheckCircle2, ShoppingCart, ShieldCheck, UserPlus, Ticket, Sparkles, type LucideIcon } from "lucide-react";
import heroPhoto from "@/assets/cadastro-hero.jpg";

/**
 * AuthHero — painel esquerdo (split) reutilizável para telas de autenticação.
 * Ocean Modern: navy #0f2b52 + dourado #f5b301.
 */

const PC_EMERALD_DEEP = "#081b3a";
const PC_EMERALD = "#0f2b52";
const PC_EMERALD_LIGHT = "#1e4a85";
const PC_GOLD = "#f5b301";
const PC_GOLD_SOFT = "#F5D77A";
const PC_DISPLAY = "'Outfit', system-ui, sans-serif";
const PC_BODY = "'Figtree', system-ui, sans-serif";

export type AuthHeroVariant = "login" | "signup" | "redeem";

type Preset = {
  badge: { icon: LucideIcon; label: string };
  title: string;
  highlight: string;
  subtitle: string;
  perks: string[];
  trust: { icon: LucideIcon; title: string; caption: string };
  brandIcon: LucideIcon;
  offer?: { label: string; title: string; caption: string };
  photo: boolean;
};

const PRESETS: Record<AuthHeroVariant, Preset> = {
  login: {
    badge: { icon: ShieldCheck, label: "Área do assinante" },
    title: "Acesse a inteligência",
    highlight: "da sua cidade.",
    subtitle: "Entre com CPF e PIN para ver o painel ao vivo dos mercados de Feijó.",
    perks: [
      "Comparativo em tempo real entre mercados",
      "Alertas de queda de preço no seu bairro",
      "Rede colaborativa validada por nota fiscal",
    ],
    trust: {
      icon: ShieldCheck,
      title: "Preços validados por nota fiscal",
      caption: "Rede colaborativa · atualizada diariamente",
    },
    brandIcon: ShoppingCart,
    offer: { label: "Oferta ativa", title: "30 dias grátis", caption: "Envie sua nota e libere o painel completo." },
    photo: false,
  },
  signup: {
    badge: { icon: UserPlus, label: "Cadastro gratuito" },
    title: "Compare preços",
    highlight: "de verdade.",
    subtitle: "Crie sua conta com CPF e PIN em 30 segundos e comece a comparar os mercados de Feijó.",
    perks: [
      "Comparativo em tempo real entre mercados",
      "Alertas de queda de preço",
      "Bônus: 30 dias grátis ao enviar sua nota",
    ],
    trust: {
      icon: ShieldCheck,
      title: "Preços validados por nota fiscal",
      caption: "Rede colaborativa · atualizada diariamente",
    },
    brandIcon: ShoppingCart,
    photo: true,
  },
  redeem: {
    badge: { icon: Ticket, label: "Ativação de licença" },
    title: "Libere seu acesso",
    highlight: "em segundos.",
    subtitle: "Cole o código PC-XXXX-XXXX-XXXX recebido no e-mail. A liberação é imediata.",
    perks: [
      "Ativação imediata após validar o código",
      "Renove ou empilhe códigos sem perder dias",
      "Suporte prioritário para assinantes",
    ],
    trust: {
      icon: Sparkles,
      title: "Códigos assinados e rastreáveis",
      caption: "Compra segura · vinculada ao seu CPF",
    },
    brandIcon: ShoppingCart,
    photo: false,
  },
};

export function AuthHero({
  variant,
  className = "",
  compact = false,
}: {
  variant: AuthHeroVariant;
  className?: string;
  compact?: boolean;
}) {
  const preset = PRESETS[variant];
  const BadgeIcon = preset.badge.icon;
  const TrustIcon = preset.trust.icon;
  const BrandIcon = preset.brandIcon;

  return (
    <aside
      className={`relative hidden min-h-[520px] flex-col justify-between overflow-hidden p-6 text-white md:flex ${className}`}
      style={{
        background: preset.photo
          ? undefined
          : `linear-gradient(165deg, ${PC_EMERALD_DEEP} 0%, ${PC_EMERALD} 55%, ${PC_EMERALD_LIGHT} 100%)`,
        fontFamily: PC_BODY,
      }}
    >
      {preset.photo && (
        <>
          <img src={heroPhoto} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(165deg, ${PC_EMERALD_DEEP}f2 0%, ${PC_EMERALD}e6 55%, ${PC_EMERALD_LIGHT}cc 100%)`,
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-40"
            style={{ background: `linear-gradient(180deg, transparent, ${PC_EMERALD_DEEP}f2)` }}
          />
        </>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-25 blur-3xl"
        style={{ background: PC_GOLD }}
      />

      {/* Top: brand + badge + headline */}
      <div className="relative">
        <div className="flex items-center gap-2.5" style={{ fontFamily: PC_DISPLAY }}>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: PC_GOLD, color: PC_EMERALD }}
          >
            <BrandIcon className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span className="text-[19px] font-bold tracking-tight text-white">PreçoCerto</span>
        </div>

        <span
          className="mt-8 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{
            borderColor: "rgba(245,215,122,0.55)",
            background: "rgba(10,22,49,0.35)",
            color: PC_GOLD_SOFT,
            backdropFilter: "blur(6px)",
          }}
        >
          <BadgeIcon className="h-3 w-3" /> {preset.badge.label}
        </span>

        <h2
          className="mt-4 tracking-tight text-white"
          style={{
            fontFamily: PC_DISPLAY,
            fontWeight: 700,
            fontSize: "clamp(1.55rem, 2.4vw, 2rem)",
            lineHeight: 1.08,
            textShadow: preset.photo ? "0 2px 12px rgba(0,0,0,0.55)" : undefined,
          }}
        >
          {preset.title}
          <br />
          <span style={{ color: PC_GOLD_SOFT }}>{preset.highlight}</span>
        </h2>

        <p
          className="mt-2.5 max-w-[36ch] text-[13px] leading-relaxed text-white/90"
          style={{ textShadow: preset.photo ? "0 1px 6px rgba(0,0,0,0.5)" : undefined }}
        >
          {preset.subtitle}
        </p>
      </div>

      {/* Bottom: perks + trust */}
      {!compact && (
        <div className="relative space-y-4">
          <ul className="space-y-2">
            {preset.perks.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2 text-[12.5px] leading-snug text-white/90"
                style={{ textShadow: preset.photo ? "0 1px 4px rgba(0,0,0,0.45)" : undefined }}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" style={{ color: PC_GOLD_SOFT }} />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div
            className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 backdrop-blur"
            style={{
              borderColor: "rgba(245,215,122,0.55)",
              background: "rgba(245,215,122,0.14)",
            }}
          >
            <div
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg"
              style={{ background: `linear-gradient(135deg, ${PC_GOLD_SOFT}, #c9a34a)`, color: PC_EMERALD_DEEP }}
            >
              <TrustIcon className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 leading-tight">
              <div
                className="text-[13px] font-bold text-white"
                style={{ fontFamily: PC_DISPLAY, letterSpacing: "-0.01em" }}
              >
                {preset.trust.title}
              </div>
              <div className="text-[11.5px] text-white/85">{preset.trust.caption}</div>
            </div>
          </div>

          {preset.offer && (
            <div
              className="rounded-xl border border-white/10 p-3"
              style={{ background: "rgba(30,74,133,0.35)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: PC_GOLD }}>
                {preset.offer.label}
              </p>
              <p className="mt-1 text-[16px] font-bold text-white" style={{ fontFamily: PC_DISPLAY }}>
                {preset.offer.title}
              </p>
              <p className="mt-0.5 text-[11px] text-white/85">{preset.offer.caption}</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/** Wrapper split-shell para telas de auth: header slim + grid 2 colunas com AuthHero à esquerda. */
export function AuthSplitShell({
  variant,
  children,
  maxWidth = "max-w-4xl",
}: {
  variant: AuthHeroVariant;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      className={`mx-auto grid w-full ${maxWidth} grid-cols-1 overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-[0_24px_60px_-24px_rgba(15,27,61,0.30)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`}
    >
      <AuthHero variant={variant} />
      <section className="relative overflow-hidden">{children}</section>
    </div>
  );
}
