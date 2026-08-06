import React from "react";
import { motion } from "framer-motion";
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
  const baseClasses = "relative flex items-center justify-center gap-2 w-full min-h-[54px] rounded-2xl font-bold transition-all duration-300 active:scale-[0.98] overflow-hidden";
  
  const variants = {
    primary: "bg-[var(--brand-primary)] text-[var(--pc-brand-navy)] hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] shadow-lg",
    secondary: "bg-[var(--pc-brand-navy)] text-white hover:bg-slate-800 shadow-md",
    outline: "bg-transparent border-2 border-[var(--border-subtle)] text-slate-600 hover:bg-slate-50",
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
            className="absolute flex items-center gap-2 text-[var(--pc-brand-navy)]"
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

import { AnimatePresence } from "framer-motion";
