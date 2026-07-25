import { CheckCircle2, ShoppingCart, ShieldCheck, UserPlus, Ticket, Sparkles, Shield, type LucideIcon } from "lucide-react";
import heroPhoto from "@/assets/cadastro-hero.jpg";
import loginPhotoAsset from "@/assets/login-market.jpg.asset.json";
import adminPhotoAsset from "@/assets/hero-supermarket.jpg.asset.json";

/**
 * AuthHero — painel (split no desktop, banner compacto no mobile) reutilizável
 * para telas de autenticação. Alinhado 100% com os tokens da homepage:
 *   • Cores: --pc-home-navy / --pc-home-navy-2 / --pc-home-gold / --pc-home-on-navy
 *     (esses tokens já flipam automaticamente entre claro e escuro em src/styles.css).
 *   • Tipografia: --font-display (Instrument Serif) para o headline, sans padrão para corpo.
 */

export type AuthHeroVariant = "login" | "signup" | "redeem" | "admin";

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
  photoSrc?: string;
};

const PRESETS: Record<AuthHeroVariant, Preset> = {
  login: {
    badge: { icon: ShieldCheck, label: "Área do assinante" },
    title: "O preço certo,",
    highlight: "aqui em Feijó.",
    subtitle: "Entre com seu CPF e PIN para acompanhar, em tempo real, os preços praticados nos mercados de Feijó.",
    perks: [
      "Comparativo entre mercados parceiros de Feijó",
      "Alertas de queda de preço no seu bairro",
      "Base auditada por notas fiscais reais",
    ],
    trust: {
      icon: ShieldCheck,
      title: "Preços conferidos por nota fiscal",
      caption: "Rede colaborativa · atualizada todo dia",
    },
    brandIcon: ShoppingCart,
    offer: { label: "Oferta ativa", title: "30 dias grátis", caption: "Envie sua nota e libere o painel completo." },
    photo: true,
    photoSrc: loginPhotoAsset.url,
  },
  signup: {
    badge: { icon: UserPlus, label: "Cadastro gratuito" },
    title: "Compare preços",
    highlight: "de verdade.",
    subtitle: "Crie sua conta com CPF e PIN em menos de 1 minuto e comece a comparar os mercados parceiros de Feijó.",
    perks: [
      "Comparativo em tempo real entre mercados parceiros",
      "Alertas de queda de preço no seu bairro",
      "Bônus: 30 dias grátis ao enviar sua primeira nota",
    ],
    trust: {
      icon: ShieldCheck,
      title: "Preços conferidos por nota fiscal",
      caption: "Rede colaborativa · atualizada todo dia",
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
    photo: true,
    photoSrc: heroPhoto,
  },
  admin: {
    badge: { icon: Shield, label: "Portal interno" },
    title: "Acesso restrito",
    highlight: "da equipe.",
    subtitle: "Entre com suas credenciais internas. Todas as ações ficam registradas na auditoria.",
    perks: [
      "Gestão de licenças, mercados e catálogo",
      "Auditoria completa de eventos e acessos",
      "Ambiente segregado com MFA e RLS",
    ],
    trust: {
      icon: ShieldCheck,
      title: "Ambiente monitorado 24/7",
      caption: "Sessões auditadas · acesso por função",
    },
    brandIcon: Shield,
    photo: true,
    photoSrc: adminPhotoAsset.url,
  },
};

// Tokens de tema (referenciados via var() — flipam automaticamente em dark)
const T = {
  navy: "var(--pc-home-navy)",
  navy2: "var(--pc-home-navy-2)",
  gold: "var(--pc-home-gold)",
  goldSoft: "var(--pc-home-gold-soft)",
  onNavy: "var(--pc-home-on-navy)",
  eyebrow: "var(--pc-eyebrow-on-navy)",
  display: "var(--font-display)",
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
      className={`relative flex min-h-[180px] flex-col justify-between overflow-hidden p-4 sm:p-5 md:min-h-[360px] ${className}`}
      style={{
        background: preset.photo
          ? undefined
          : `linear-gradient(165deg, ${T.navy} 0%, ${T.navy} 55%, ${T.navy2} 100%)`,
        color: T.onNavy,
      }}
    >
      {preset.photo && (
        <>
          <img
            src={preset.photoSrc ?? heroPhoto}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "saturate(0.9) brightness(0.7) contrast(1.05)" }}
          />
          {/* Scrim navy garante contraste WCAG AA das palavras sobre a foto */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, color-mix(in oklab, ${T.navy} 82%, transparent) 0%, color-mix(in oklab, ${T.navy} 58%, transparent) 45%, color-mix(in oklab, ${T.navy} 85%, transparent) 100%)`,
            }}
          />
        </>
      )}

      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-40 w-40 rounded-full opacity-15 blur-2xl motion-reduce:hidden"
        style={{ background: T.gold }}
      />


      {/* Top: brand + badge + headline */}
      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: T.gold, color: T.navy }}
          >
            <BrandIcon className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <span
            className="text-[18px] font-bold tracking-tight sm:text-[19px]"
            style={{ color: T.onNavy, fontFamily: T.display, letterSpacing: "-0.01em" }}
          >
            PreçoCerto
          </span>
        </div>

        <span
          className="mt-5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] md:mt-8"
          style={{
            borderColor: `color-mix(in oklab, ${T.gold} 60%, transparent)`,
            background: `color-mix(in oklab, ${T.navy} 70%, transparent)`,
            color: T.eyebrow,
          }}
        >
          <BadgeIcon className="h-3 w-3" /> {preset.badge.label}
        </span>


        <h2
          className="mt-3 tracking-tight md:mt-4"
          style={{
            fontFamily: T.display,
            fontWeight: 400,
            fontSize: "clamp(1.5rem, 4.4vw, 2.1rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.01em",
            color: T.onNavy,
            textShadow: preset.photo ? "0 2px 18px rgba(0,0,0,0.75), 0 1px 4px rgba(0,0,0,0.6)" : undefined,
          }}
        >
          {preset.title}{" "}
          <span className="italic md:hidden" style={{ color: T.gold, textShadow: preset.photo ? "0 2px 16px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.7)" : undefined }}>{preset.highlight}</span>
          <span className="hidden md:inline">
            <br />
            <span className="italic" style={{ color: T.gold, textShadow: preset.photo ? "0 2px 16px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.7)" : undefined }}>{preset.highlight}</span>
          </span>
        </h2>

        <p
          className="mt-2 max-w-[38ch] text-[12.5px] leading-relaxed sm:text-[13px] md:mt-2.5"
          style={{
            color: `color-mix(in oklab, ${T.onNavy} 94%, transparent)`,
            textShadow: preset.photo ? "0 1px 10px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.55)" : undefined,
          }}
        >
          {preset.subtitle}
        </p>
      </div>

      {/* Bottom: perks + trust — ocultos no mobile para manter a rota compacta */}
      {!compact && (
        <div className="relative mt-5 hidden space-y-4 md:mt-0 md:block">
          <ul className="space-y-2">
            {preset.perks.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2 text-[12.5px] leading-snug"
                style={{
                  color: `color-mix(in oklab, ${T.onNavy} 92%, transparent)`,
                  textShadow: preset.photo ? "0 1px 4px rgba(0,0,0,0.45)" : undefined,
                }}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" style={{ color: T.eyebrow }} />
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div
            className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5"
            style={{
              borderColor: `color-mix(in oklab, ${T.gold} 50%, transparent)`,
              background: `color-mix(in oklab, ${T.navy2} 60%, transparent)`,
            }}
          >
            <div
              className="flex h-9 w-9 flex-none items-center justify-center rounded-lg"
              style={{ background: T.gold, color: T.navy }}
            >
              <TrustIcon className="h-4.5 w-4.5" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 leading-tight">
              <div
                className="text-[13px] font-semibold tracking-tight"
                style={{ color: T.onNavy, letterSpacing: "-0.005em" }}
              >
                {preset.trust.title}
              </div>
              <div
                className="mt-0.5 text-[11.5px]"
                style={{ color: `color-mix(in oklab, ${T.onNavy} 82%, transparent)` }}
              >
                {preset.trust.caption}
              </div>
            </div>
          </div>


          {preset.offer && (
            <div
              className="rounded-xl border p-3"
              style={{
                background: `color-mix(in oklab, ${T.navy2} 45%, transparent)`,
                borderColor: `color-mix(in oklab, ${T.onNavy} 12%, transparent)`,
              }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: T.eyebrow }}>
                {preset.offer.label}
              </p>
              <p
                className="mt-1 text-[18px]"
                style={{ color: T.onNavy, fontFamily: T.display, fontWeight: 400, letterSpacing: "-0.01em" }}
              >
                {preset.offer.title}
              </p>
              <p
                className="mt-0.5 text-[11px]"
                style={{ color: `color-mix(in oklab, ${T.onNavy} 85%, transparent)` }}
              >
                {preset.offer.caption}
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/** Wrapper split-shell: banner topo no mobile, split 2 colunas no desktop. */
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
      className={`mx-auto grid w-full ${maxWidth} grid-cols-1 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-[0_24px_60px_-24px_rgba(15,27,61,0.30)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]`}
    >
      <AuthHero variant={variant} />
      <section className="relative overflow-hidden">{children}</section>
    </div>
  );
}
