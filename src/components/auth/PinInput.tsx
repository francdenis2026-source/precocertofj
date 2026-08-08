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
            ref={(el) => { inputs.current[i] = el; }}
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
              w-full h-full text-center text-xl font-black rounded-2xl border-2 transition-all duration-200 outline-none
              ${
                focusedIndex === i
                  ? "border-[#2563EB] bg-white ring-4 ring-[#2563EB]/5 scale-105"
                  : values[i]
                  ? "border-[#2563EB]/40 bg-white"
                  : "border-[#E5EAF1] bg-[#F8FAFC]"
              }
              ${error ? "border-rose-200 bg-rose-50/30" : ""}
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"}
            `}
          />
          <AnimatePresence>
            {focusedIndex === i && (
              <motion.div
                layoutId="pin-cursor"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#2563EB] rounded-full"
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
