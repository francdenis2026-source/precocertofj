import { useCallback, useEffect, useState } from "react";

/**
 * useLocalStorageState — persistência simples em localStorage.
 *
 * - SSR-safe: no primeiro render usa o `initialValue`, e hidrata do storage
 *   dentro de `useEffect` (evita mismatch de hidratação).
 * - Serializa via JSON. Se o valor lido não bater com o tipo esperado,
 *   um `validate` opcional descarta e mantém o default.
 */
export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  opts?: { validate?: (v: unknown) => v is T },
): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return;
      const parsed = JSON.parse(raw) as unknown;
      if (opts?.validate) {
        if (opts.validate(parsed)) setValue(parsed);
      } else {
        setValue(parsed as T);
      }
    } catch {
      // ignore corrupted entries
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (v: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage disabled/full — silencioso.
        }
        return next;
      });
    },
    [key],
  );

  return [value, update];
}
