import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export const PinInput: React.FC<PinInputProps> = ({
  length = 6,
  value,
  onChange,
  error,
  disabled,
}) => {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const values = value.split("").slice(0, length);
  while (values.length < length) values.push("");

  const handleChange = (val: string, index: number) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const newValues = [...values];
    newValues[index] = digit;
    const nextValue = newValues.join("");
    onChange(nextValue);

    if (digit && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pastedData) {
      onChange(pastedData);
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputs.current[nextIndex]?.focus();
    }
  };

  return (
    <motion.div 
      className="flex justify-between gap-2 sm:gap-3"
      animate={error ? { x: [-4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {Array.from({ length }).map((_, i) => (
        <div key={i} className="relative flex-1 aspect-square max-w-[56px]">
          <input
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={values[i]}
            onChange={(e) => handleChange(e.target.value, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={handlePaste}
            onFocus={() => setFocusedIndex(i)}
            onBlur={() => setFocusedIndex(null)}
            disabled={disabled}
            className={`
              w-full h-full text-center text-xl font-bold rounded-xl border-2 transition-all duration-200 outline-none
              ${
                focusedIndex === i
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 shadow-[0_0_15px_rgba(212,175,55,0.2)] scale-105"
                  : values[i]
                  ? "border-[var(--brand-primary)]/40 bg-[var(--bg-surface)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/50"
              }
              ${error ? "border-red-500/50 bg-red-500/5" : ""}
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}
            `}
          />
          <AnimatePresence>
            {focusedIndex === i && (
              <motion.div
                layoutId="pin-cursor"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[var(--brand-primary)] rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>
        </div>
      ))}
    </motion.div>
  );
};
