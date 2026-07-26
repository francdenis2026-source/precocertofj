/**
 * SmartLogo — apresentação inteligente e padronizada de logomarcas.
 *
 *  • Analisa a imagem no cliente (uma vez por URL, com cache em memória).
 *  • Escolhe automaticamente o fundo de melhor contraste (branco ou suave).
 *  • Normaliza recorte, escala e centralização: todas as marcas ficam com a
 *    mesma altura visual, sem distorcer proporção nem estourar as bordas.
 *  • Variação "3D premium" opcional: relevo leve + sombra realista, sem
 *    aumentar a altura do tile.
 */
import { useEffect, useState } from "react";
import {
  analyzeLogo,
  computeLogoPresentation,
  type LogoMetrics,
  type LogoPresentation,
} from "@/lib/logo-quality";
import { cn } from "@/lib/utils";

const cache = new Map<string, LogoMetrics>();
const inflight = new Map<string, Promise<LogoMetrics>>();

function getMetrics(src: string): Promise<LogoMetrics> {
  const hit = cache.get(src);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(src);
  if (pending) return pending;
  const p = analyzeLogo(src).then((m) => {
    cache.set(src, m);
    inflight.delete(src);
    return m;
  });
  inflight.set(src, p);
  return p;
}

/** Métricas + apresentação recomendada para uma logo. */
export function useLogoPresentation(
  src?: string | null,
  opts: { targetFill?: number } = {},
): { metrics: LogoMetrics | null; presentation: LogoPresentation; ready: boolean } {
  const [metrics, setMetrics] = useState<LogoMetrics | null>(() =>
    src ? cache.get(src) ?? null : null,
  );

  useEffect(() => {
    if (!src) {
      setMetrics(null);
      return;
    }
    const cached = cache.get(src);
    if (cached) {
      setMetrics(cached);
      return;
    }
    let alive = true;
    void getMetrics(src).then((m) => {
      if (alive) setMetrics(m);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  return {
    metrics,
    presentation: computeLogoPresentation(metrics, opts),
    ready: Boolean(metrics),
  };
}

export type SmartLogoProps = {
  src?: string | null;
  name: string;
  /** Altura do quadro (px). O relevo 3D não altera esta medida. */
  frameHeight?: number;
  /** Relevo/sombra premium. */
  premium3d?: boolean;
  /** Fração do quadro que a marca deve ocupar. */
  targetFill?: number;
  /** Força o fundo em vez de deixar o cálculo automático decidir. */
  background?: "auto" | "white" | "soft";
  className?: string;
  imgClassName?: string;
};

const SOFT_BG =
  "linear-gradient(160deg, #f6f8fc 0%, #eef2f8 55%, #e8edf5 100%)";

/**
 * Renderiza apenas a imagem normalizada (sem moldura própria) —
 * o container define tamanho, borda e raio.
 */
export function SmartLogoImage({
  src,
  name,
  premium3d = false,
  targetFill = 0.94,
  className,
  eager = true,
}: Pick<SmartLogoProps, "src" | "name" | "premium3d" | "targetFill"> & {
  className?: string;
  /** Carrega imediatamente (padrão) — evita tiles vazios acima/perto da dobra. */
  eager?: boolean;
}) {
  const { presentation, ready } = useLogoPresentation(src, { targetFill });
  if (!src) return null;

  return (
    <img
      src={src}
      alt={`Logomarca ${name}`}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      className={cn(
        "max-h-full max-w-full object-contain transition-[opacity,transform] duration-300",
        className,
      )}
      style={{
        transform: `translate(${presentation.offsetX}%, ${presentation.offsetY}%) scale(${presentation.scale})`,
        opacity: ready ? 1 : 0.9,
        filter: premium3d
          ? "drop-shadow(0 1px 1px rgba(15,23,42,0.16))"
          : undefined,
      }}
    />
  );
}

/** Quadro completo com fundo inteligente + relevo opcional. */
export function SmartLogo({
  src,
  name,
  frameHeight = 72,
  premium3d = false,
  targetFill = 0.9,
  background = "auto",
  className,
  imgClassName,
}: SmartLogoProps) {
  const { presentation } = useLogoPresentation(src, { targetFill });
  const mode = background === "auto" ? presentation.background : background;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[10px]",
        "border border-black/[0.07]",
        className,
      )}
      style={{
        height: frameHeight,
        background: mode === "soft" ? SOFT_BG : "#ffffff",
        boxShadow: premium3d
          ? "inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.14), 0 8px 18px -12px rgba(15,23,42,0.45)"
          : "0 1px 2px rgba(15,23,42,0.14)",
      }}
    >
      {src ? (
        <div className="flex h-full w-full items-center justify-center px-2 py-1.5">
          <SmartLogoImage
            src={src}
            name={name}
            premium3d={premium3d}
            targetFill={targetFill}
            className={imgClassName}
          />
        </div>
      ) : (
        <span className="px-1.5 text-center text-[10px] font-bold uppercase leading-[1.05] tracking-[0.08em] text-slate-700">
          {name}
        </span>
      )}
      {premium3d ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[10px]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)",
          }}
        />
      ) : null}
    </div>
  );
}
