import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ContamigosLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "on-dark";
  size?: "xs" | "sm" | "md" | "lg";
  hideName?: boolean;
}

/**
 * Logo profissional para Varejão Contamigos.
 * Design modernizado com um ícone de "check/cesta" estilizado e nome em SVG no hover.
 */
export function ContamigosLogo({
  variant = "default",
  size = "md",
  hideName = false,
  className,
  ...props
}: ContamigosLogoProps) {
  const isDark = variant === "on-dark";
  
  const sizes = {
    xs: "h-6",
    sm: "h-8",
    md: "h-12",
    lg: "h-20"
  };

  const iconSizes = {
    xs: "h-5 w-5",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16"
  };

  const svgSizes = {
    xs: "h-3 w-3",
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-10 w-10"
  };

  return (
    <motion.div 
      className={cn(
        "group relative flex items-center gap-3 select-none",
        sizes[size],
        className
      )} 
      initial={false}
    >
      {/* Ícone Estilizado: Uma cesta/sacola formada por linhas geométricas */}
      <div className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl transition-all duration-300 transform-gpu",
        iconSizes[size],
        "bg-[#D4AF37] shadow-lg shadow-[#D4AF37]/20 group-hover:shadow-[#D4AF37]/40 group-hover:scale-105"
      )}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={svgSizes[size]}
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>

      <AnimatePresence>
        {(!hideName || props.title === "Logo") && (
          <motion.div 
            className={cn(
              "flex flex-col justify-center leading-none",
              hideName && "absolute left-full ml-3 opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 bg-[var(--bg-surface)] p-2 rounded-lg border border-border shadow-xl"
            )}
            initial={hideName ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
            animate={{ opacity: 1, x: 0 }}
            exit={hideName ? { opacity: 0, x: -10 } : undefined}
          >
            <div className="flex items-center">
              <span className={cn(
                "font-display font-black tracking-tighter uppercase italic",
                size === "xs" ? "text-sm" : size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-4xl",
                isDark ? "text-white" : "text-[#0B1E3A]"
              )}>
                Varejão
                <span className="text-[#D4AF37] not-italic ml-1">Contamigos</span>
              </span>
            </div>
            <span className={cn(
              "font-mono font-bold tracking-[0.2em] uppercase",
              size === "xs" ? "text-[6px]" : size === "sm" ? "text-[8px]" : size === "md" ? "text-[10px]" : "text-[14px]",
              isDark ? "text-white/60" : "text-[#0B1E3A]/60"
            )}>
              Preço Baixo de Verdade
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
