import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string | null;
  success?: boolean;
  suffix?: React.ReactNode;
}

export const AuthInput: React.FC<AuthInputProps> = ({
  label,
  icon: Icon,
  error,
  success,
  suffix,
  onFocus,
  onBlur,
  className = "",
  value,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const isFilled = value !== undefined && value !== null && value !== "";

  return (
    <div className="relative w-full">
      <div
        className={`
          relative flex items-center gap-3 w-full min-h-[56px] px-4 rounded-[var(--radius-2xl)] border-2 transition-all duration-300
          ${
            isFocused
              ? "border-[var(--brand-primary)] bg-[var(--bg-surface)] shadow-[0_0_20px_rgba(212,175,55,0.1)]"
              : error
              ? "border-red-500/50 bg-red-500/5"
              : success
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/30 hover:border-[var(--border-subtle)]/80"
          }
          ${className}
        `}
      >
        {Icon && (
          <Icon
            className={`w-5 h-5 transition-colors duration-300 ${
              isFocused ? "text-[var(--brand-primary)]" : error ? "text-red-500" : success ? "text-emerald-500" : "text-slate-400"
            }`}
          />
        )}

        <div className="relative flex-1 flex flex-col pt-4">
          <motion.label
            initial={false}
            animate={{
              y: isFocused || isFilled ? -22 : 0,
              scale: isFocused || isFilled ? 0.8 : 1,
              color: isFocused ? "var(--brand-primary)" : error ? "#EF4444" : success ? "#10B981" : "#94A3B8",
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute left-0 pointer-events-none origin-left font-medium ${isFocused || isFilled ? "text-[var(--brand-primary)]" : "text-slate-400"}`}
          >
            {label}
          </motion.label>
          <input
            {...props}
            value={value}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            className="w-full bg-transparent border-none outline-none text-slate-900 font-semibold text-[15px] pb-1"
          />
        </div>

        {suffix && <div className="ml-2">{suffix}</div>}
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-5 left-1 text-[10px] font-bold text-red-500 uppercase tracking-wider"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
