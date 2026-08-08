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
          relative flex items-center gap-3 w-full min-h-[56px] px-4 rounded-2xl border-2 transition-all duration-300
          ${
            isFocused
              ? "border-[#2563EB] bg-white ring-4 ring-[#2563EB]/5"
              : error
              ? "border-rose-200 bg-rose-50/30"
              : success
              ? "border-emerald-200 bg-emerald-50/30"
              : "border-[#E5EAF1] bg-[#F8FAFC] hover:border-[#CBD5E1]"
          }
          ${className}
        `}
      >
        {Icon && (
          <Icon
            className={`w-5 h-5 transition-colors duration-300 ${
              isFocused ? "text-[var(--brand-primary)]" : error ? "text-red-500" : success ? "text-emerald-500" : "text-[var(--text-tertiary)]"
            }`}
          />
        )}

        <div className="relative flex-1 flex flex-col pt-4">
          <motion.label
            initial={false}
            animate={{
              y: isFocused || isFilled ? -22 : 0,
              scale: isFocused || isFilled ? 0.75 : 1,
              color: isFocused ? "#2563EB" : error ? "#E11D48" : success ? "#059669" : "#64748B",
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute left-0 pointer-events-none origin-left font-black text-[10px] uppercase tracking-widest ${isFocused || isFilled ? "text-[#2563EB]" : "text-[#64748B]"}`}
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
            className="w-full bg-transparent border-none outline-none text-[#0F172A] font-bold text-[15px] pb-1 uppercase placeholder:normal-case"
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
