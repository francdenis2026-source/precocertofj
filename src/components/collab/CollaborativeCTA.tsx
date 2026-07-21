import { Mail, Gift, ShieldCheck, Sparkles, ArrowRight, Receipt } from "lucide-react";
import { COLLAB_EMAIL, collabMailtoHref } from "@/lib/collab-mailto";

const mailHref = collabMailtoHref;

/**
 * Bloco editorial explicando o modelo colaborativo do PreçoCerto.
 * Reutilizável na home e no login. Design premium: gradiente suave,
 * ilustração SVG de nota fiscal, três selos (grátis / atualizado / seguro).
 */
export function CollaborativeCTA({
  variant = "light",
  compact = false,
  className = "",
}: {
  variant?: "light" | "dark";
  compact?: boolean;
  className?: string;
}) {
  const isDark = variant === "dark";
  return (
    <section
      aria-labelledby="collab-title"
      className={
        "relative overflow-hidden rounded-3xl border shadow-[0_1px_0_0_rgb(0_0_0/0.04)] " +
        (isDark
          ? "border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent backdrop-blur-xl "
          : "border-border/70 bg-gradient-to-br from-primary/5 via-card to-background ") +
        (compact ? "p-5 md:p-6 " : "p-6 md:p-9 ") +
        className
      }
    >
      {/* Filete de assinatura */}
      <span
        aria-hidden
        className={
          "absolute left-8 top-0 h-1 w-20 rounded-b-full " +
          (isDark ? "bg-emerald-300" : "bg-primary")
        }
      />
      {/* Halo decorativo */}
      <span
        aria-hidden
        className={
          "pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl " +
          (isDark ? "bg-emerald-400/20" : "bg-primary/15")
        }
      />

      <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-10">
        <div className="min-w-0">
          <p
            className={
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] " +
              (isDark
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                : "border-primary/25 bg-primary/10 text-primary")
            }
          >
            <Sparkles className="h-3 w-3" strokeWidth={2.6} />
            Rede colaborativa
          </p>

          <h3
            id="collab-title"
            className={
              "mt-3 font-display text-[26px] leading-[1.06] tracking-tight md:text-[32px] " +
              (isDark ? "text-white" : "text-foreground")
            }
          >
            Envie sua nota fiscal.{" "}
            <span
              className={
                isDark
                  ? "bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent"
                  : "text-primary"
              }
            >
              Ganhe 30 dias grátis
            </span>{" "}
            após confirmação.
          </h3>

          <p
            className={
              "mt-3 max-w-xl text-[14px] leading-relaxed md:text-[15px] " +
              (isDark ? "text-white/90" : "text-muted-foreground")
            }
          >
            O PreçoCerto é <strong className={isDark ? "text-white" : "text-foreground"}>colaborativo</strong>: cada nota
            enviada mantém os preços do bairro atualizados para todo mundo. Ao enviar cupons ou notas dos seus mercados
            favoritos para o e-mail abaixo, você recebe <strong className={isDark ? "text-white" : "text-foreground"}>30 dias de acesso completo</strong> após conferência da equipe.
          </p>

          <ul
            className={
              "mt-4 grid gap-2 text-[13px] md:grid-cols-3 md:gap-3 " +
              (isDark ? "text-white/95" : "text-foreground")
            }
          >
            <li className="flex items-start gap-2">
              <span
                className={
                  "mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full " +
                  (isDark ? "bg-emerald-300/15 text-emerald-200" : "bg-primary/10 text-primary")
                }
              >
                <Gift className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              30 dias de acesso após conferência
            </li>
            <li className="flex items-start gap-2">
              <span
                className={
                  "mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full " +
                  (isDark ? "bg-emerald-300/15 text-emerald-200" : "bg-primary/10 text-primary")
                }
              >
                <Receipt className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              Preços sempre atualizados
            </li>
            <li className="flex items-start gap-2">
              <span
                className={
                  "mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full " +
                  (isDark ? "bg-emerald-300/15 text-emerald-200" : "bg-primary/10 text-primary")
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              Seus dados ficam protegidos
            </li>
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={mailHref()}
              className={
                "inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold shadow-[0_2px_0_0_rgb(0_0_0/0.08)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
                (isDark
                  ? "bg-emerald-300 text-emerald-950 hover:bg-emerald-200 focus-visible:ring-emerald-300 focus-visible:ring-offset-transparent"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary focus-visible:ring-offset-background")
              }
            >
              <Mail className="h-4 w-4" strokeWidth={2.4} />
              Enviar nota fiscal
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
            </a>
            <a
              href={`mailto:${COLLAB_EMAIL}`}
              className={
                "select-all font-mono text-[12.5px] font-semibold underline-offset-4 hover:underline " +
                (isDark ? "text-white/95" : "text-foreground")
              }
            >
              {COLLAB_EMAIL}
            </a>
            <a
              href="/colaborar"
              className={
                "text-[12.5px] font-semibold underline-offset-4 hover:underline " +
                (isDark ? "text-emerald-200" : "text-primary")
              }
            >
              Como funciona →
            </a>
          </div>
        </div>

        {/* Ilustração SVG — nota fiscal estilizada */}
        <div className="relative hidden shrink-0 md:block">
          <ReceiptIllustration dark={isDark} />
        </div>
      </div>
    </section>
  );
}

function ReceiptIllustration({ dark }: { dark: boolean }) {
  // Papel do recibo — sempre claro para contraste em qualquer tema.
  const paper = "#fefce8";
  const paperShadow = "#fde68a";
  const ink = "#111827";
  const inkMuted = "#6b7280";
  const stroke = "rgba(0,0,0,0.12)";
  const envelope = dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)";
  const envelopeStroke = dark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.14)";
  const accent = "#10b981";

  return (
    <svg
      width="180"
      height="220"
      viewBox="0 0 180 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="drop-shadow-[0_18px_36px_rgba(0,0,0,0.28)]"
    >
      <defs>
        <linearGradient id="collab-receipt-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={paper} />
          <stop offset="100%" stopColor={paperShadow} />
        </linearGradient>
      </defs>
      <g transform="rotate(-8 90 110)">
        <rect x="18" y="40" width="130" height="150" rx="10" fill={envelope} stroke={envelopeStroke} strokeWidth="1.4" />
      </g>
      <g transform="rotate(5 90 110)">
        <path
          d="M32 24 H148 V190 L136 182 L124 190 L112 182 L100 190 L88 182 L76 190 L64 182 L52 190 L40 182 L32 190 Z"
          fill="url(#collab-receipt-bg)"
          stroke={stroke}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <rect x="46" y="40" width="60" height="6" rx="3" fill={ink} opacity="0.92" />
        <rect x="46" y="52" width="88" height="4" rx="2" fill={inkMuted} />
        <line x1="46" y1="66" x2="134" y2="66" stroke={stroke} strokeDasharray="2 3" />
        <rect x="46" y="76" width="52" height="4" rx="2" fill={ink} opacity="0.75" />
        <rect x="112" y="76" width="22" height="4" rx="2" fill={ink} opacity="0.9" />
        <rect x="46" y="88" width="44" height="4" rx="2" fill={ink} opacity="0.75" />
        <rect x="112" y="88" width="22" height="4" rx="2" fill={ink} opacity="0.9" />
        <rect x="46" y="100" width="58" height="4" rx="2" fill={ink} opacity="0.75" />
        <rect x="112" y="100" width="22" height="4" rx="2" fill={ink} opacity="0.9" />
        <line x1="46" y1="114" x2="134" y2="114" stroke={stroke} strokeDasharray="2 3" />
        <rect x="46" y="124" width="36" height="6" rx="3" fill={accent} />
        <rect x="102" y="122" width="32" height="10" rx="3" fill={accent} opacity="0.9" />
        <g transform="translate(96 148) rotate(-12)">
          <circle cx="20" cy="20" r="20" fill={accent} stroke="#ffffff" strokeWidth="2" />
          <text x="20" y="18" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="8" fontWeight="800" fill="#ffffff">
            +30 DIAS
          </text>
          <text x="20" y="28" textAnchor="middle" fontFamily="ui-sans-serif, system-ui" fontSize="9" fontWeight="900" fill="#ffffff">
            GRÁTIS
          </text>
        </g>
      </g>
    </svg>
  );
}
