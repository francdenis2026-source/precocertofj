import { cn } from "@/lib/utils";

interface ContamigosLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "on-dark";
  size?: "sm" | "md" | "lg";
}

/**
 * Logo profissional para Varejão Contamigos.
 * Inspirada na fachada original (vermelho e branco) com tipografia robusta.
 * Design modernizado com um ícone de "check/cesta" estilizado.
 */
export function ContamigosLogo({
  variant = "default",
  size = "md",
  className,
  ...props
}: ContamigosLogoProps) {
  const isDark = variant === "on-dark";
  
  const sizes = {
    sm: "h-8",
    md: "h-12",
    lg: "h-20"
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 select-none",
        sizes[size],
        className
      )} 
      {...props}
    >
      {/* Ícone Estilizado: Uma cesta/sacola formada por linhas geométricas */}
      <div className={cn(
        "relative flex shrink-0 items-center justify-center rounded-xl",
        size === "sm" ? "h-8 w-8" : size === "md" ? "h-10 w-10" : "h-16 w-16",
        "bg-[#E63946] shadow-lg shadow-[#E63946]/20"
      )}>
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={size === "sm" ? "h-5 w-5" : size === "md" ? "h-6 w-6" : "h-10 w-10"}
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>

      <div className="flex flex-col justify-center leading-none">
        <span className={cn(
          "font-display font-black tracking-tighter uppercase italic",
          size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-4xl",
          isDark ? "text-white" : "text-[#0B1E3A]"
        )}>
          Varejão
          <span className="text-[#E63946] not-italic ml-1">Contamigos</span>
        </span>
        <span className={cn(
          "font-mono font-bold tracking-[0.2em] uppercase",
          size === "sm" ? "text-[8px]" : size === "md" ? "text-[10px]" : "text-[14px]",
          isDark ? "text-white/60" : "text-[#0B1E3A]/60"
        )}>
          Preço Baixo de Verdade
        </span>
      </div>
    </div>
  );
}
