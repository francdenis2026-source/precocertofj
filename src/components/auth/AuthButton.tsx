import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, LucideIcon } from "lucide-react";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "outline";
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  children,
  loading,
  success,
  error,
  icon: Icon,
  variant = "primary",
  disabled,
  className = "",
  ...props
}) => {
  const baseClasses = "relative flex items-center justify-center gap-2 w-full min-h-[56px] rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 active:scale-[0.98] overflow-hidden";
  
  const variants = {
    primary: "bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-[0_12px_24px_-8px_rgba(37,99,235,0.4)] shadow-lg disabled:shadow-none",
    secondary: "bg-[#F8FAFC] text-[#0F172A] border border-[#E5EAF1] hover:bg-[#F1F5F9]",
    outline: "bg-transparent border-2 border-[#E5EAF1] text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F172A]",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading || success}
      className={`${baseClasses} ${variants[variant]} ${disabled ? "opacity-50 grayscale cursor-not-allowed" : ""} ${className}`}
    >
      <motion.div
        animate={loading || success || error ? { y: -30, opacity: 0 } : { y: 0, opacity: 1 }}
        className="flex items-center gap-2"
      >
        {Icon && <Icon className="w-5 h-5" />}
        {children}
      </motion.div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="absolute flex items-center gap-2"
          >
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processando...</span>
          </motion.div>
        )}
        {success && (
          <motion.div
            key="success"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute flex items-center gap-2 text-[var(--text-on-brand)]"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Sucesso</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            key="error"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute flex items-center gap-2 text-red-600"
          >
            <AlertCircle className="w-5 h-5" />
            <span>Erro</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ripple/Glow effect on hover */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] transition-transform" />
    </button>
  );
};
