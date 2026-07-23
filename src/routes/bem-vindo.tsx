import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMyProfile } from "@/hooks/useMyProfile";
import { safeInternalPath } from "@/lib/auth-redirect";
import { getMyOnboardingStatus } from "@/lib/admin-security.functions";

export const Route = createFileRoute("/bem-vindo")({
  head: () => ({
    meta: [
      { title: "Bem-vindo — PreçoCerto" },
      { name: "description", content: "Boas-vindas ao PreçoCerto." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WelcomePage,
});

const NAVY_DEEP = "#0a1631";
const NAVY = "#0f1b3d";
const NAVY_LIGHT = "#1e3a5f";
const GOLD = "#b58a3c";
const GOLD_SOFT = "#e6c977";
const CREAM = "#f4f6fb";
const DISPLAY = "'Outfit', system-ui, sans-serif";
const BODY = "'Figtree', system-ui, sans-serif";

const REDIRECT_MS = 2800;

function WelcomePage() {
  const router = useRouter();
  const { firstName, loading } = useMyProfile();
  const [progress, setProgress] = useState(0);

  const target = useMemo(() => {
    if (typeof window === "undefined") return "/app";
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("next");
    return safeInternalPath(raw) ?? "/app";
  }, []);

  const getStatus = useServerFn(getMyOnboardingStatus);
  const status = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: () => getStatus(),
    staleTime: 30_000,
  });
  const needsOnboarding = status.data ? !status.data.completed : false;

  useEffect(() => {
    // Enquanto ainda não sabemos o status, não inicia countdown
    if (status.isLoading) return;

    // Se precisa completar cadastro, redireciona imediatamente
    if (needsOnboarding) {
      const next = encodeURIComponent(target);
      router.history.replace(`/onboarding?next=${next}`);
      return;
    }

    const start = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, (elapsed / REDIRECT_MS) * 100));
    }, 40);
    const timeout = window.setTimeout(() => {
      router.history.replace(target);
    }, REDIRECT_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [router, target, status.isLoading, needsOnboarding]);

  const greetingName = firstName ? `, ${firstName}` : "";

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-8"
      style={{
        background: `radial-gradient(ellipse at top, ${NAVY_LIGHT} 0%, ${NAVY} 45%, ${NAVY_DEEP} 100%)`,
        fontFamily: BODY,
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-40 top-1/4 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${GOLD}55, transparent)` }}
        />
        <div
          className="absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full opacity-20 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${GOLD_SOFT}55, transparent)` }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-[520px] flex-col items-center text-center"
      >
        <WelcomeMark />

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-8 text-[11px] font-bold uppercase tracking-[0.28em]"
          style={{ color: GOLD_SOFT }}
        >
          Tudo pronto
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.55 }}
          className="mt-3 text-[34px] leading-[1.05] font-bold tracking-tight text-white sm:text-[42px]"
          style={{ fontFamily: DISPLAY }}
        >
          Bora economizar{loading ? "" : greetingName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.55 }}
          className="mt-4 max-w-[420px] text-[14.5px] leading-relaxed"
          style={{ color: "rgba(244,246,251,0.78)" }}
        >
          Seu painel já está carregando com os preços mais recentes dos mercados
          de Feijó. Em poucos segundos você vê onde a cesta sai mais barata hoje.
        </motion.p>

        {/* Progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-10 h-[3px] w-full max-w-[280px] overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.12)" }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-75 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${GOLD}, ${GOLD_SOFT})`,
            }}
          />
        </motion.div>

        <motion.button
          type="button"
          onClick={() => router.history.replace(target)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.4 }}
          className="mt-6 text-[12px] font-semibold underline-offset-4 transition hover:underline"
          style={{ color: GOLD_SOFT, fontFamily: BODY }}
        >
          Ir agora para o painel →
        </motion.button>
      </motion.div>
    </div>
  );
}

/**
 * SVG mark — animated seal with a checkmark, a laurel of price tags, and
 * concentric rings evoking "acesso liberado". Purely decorative; no text
 * duplication with the heading.
 */
function WelcomeMark() {
  return (
    <motion.svg
      initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      width="148"
      height="148"
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="wm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD_SOFT} />
          <stop offset="1" stopColor={GOLD} />
        </linearGradient>
        <linearGradient id="wm-navy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={NAVY_LIGHT} />
          <stop offset="1" stopColor={NAVY_DEEP} />
        </linearGradient>
        <radialGradient id="wm-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={GOLD_SOFT} stopOpacity="0.55" />
          <stop offset="1" stopColor={GOLD_SOFT} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo */}
      <circle cx="100" cy="100" r="96" fill="url(#wm-glow)" />

      {/* Outer ring */}
      <motion.circle
        cx="100"
        cy="100"
        r="82"
        stroke={GOLD}
        strokeWidth="1.2"
        strokeDasharray="4 6"
        fill="none"
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "100px 100px" }}
        opacity="0.55"
      />

      {/* Middle ring */}
      <circle cx="100" cy="100" r="70" stroke={GOLD_SOFT} strokeOpacity="0.35" strokeWidth="1" fill="none" />

      {/* Seal disc */}
      <circle cx="100" cy="100" r="58" fill="url(#wm-navy)" stroke={GOLD} strokeWidth="2" />

      {/* Price-tag laurel — left */}
      <g fill={GOLD} opacity="0.85">
        <path d="M42 78 l14 -6 l6 14 l-14 6 z" />
        <circle cx="49" cy="79" r="1.6" fill={NAVY_DEEP} />
      </g>
      {/* Price-tag laurel — right */}
      <g fill={GOLD} opacity="0.85">
        <path d="M158 78 l-14 -6 l-6 14 l14 6 z" />
        <circle cx="151" cy="79" r="1.6" fill={NAVY_DEEP} />
      </g>
      {/* Price-tag laurel — bottom */}
      <g fill={GOLD_SOFT} opacity="0.9">
        <path d="M92 158 l16 0 l0 -14 l-16 0 z" />
        <circle cx="100" cy="151" r="1.8" fill={NAVY_DEEP} />
      </g>

      {/* Checkmark stroked with animation */}
      <motion.path
        d="M74 102 L94 122 L130 82"
        stroke="url(#wm-gold)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </motion.svg>
  );
}
