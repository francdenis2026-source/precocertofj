import { MapPin, Navigation, X } from "lucide-react";
import { useMemo } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KNOWN_NEIGHBORHOODS } from "@/lib/geo";
import { NEIGHBORHOOD_LABELS_BY_KEY } from "@/lib/geo-labels";
import type { useUserLocation } from "@/hooks/useUserLocation";

type Loc = ReturnType<typeof useUserLocation>;

type Props = {
  loc: Loc;
  className?: string;
  /**
   * Rendering variant.
   * - "hero": light-on-dark chip suited for navy scrims.
   * - "surface": neutral chip for cards / detail pages.
   */
  variant?: "hero" | "surface";
};

/**
 * Reusable geolocation control. Presents a single primary CTA
 * ("Perto de mim") and — when permission is denied or unavailable —
 * a "Meu bairro" selector so the user always has a path forward.
 */
export function LocationControl({ loc, className = "", variant = "hero" }: Props) {
  const options = useMemo(
    () => KNOWN_NEIGHBORHOODS.map((k) => ({ key: k, label: NEIGHBORHOOD_LABELS_BY_KEY[k] ?? k })),
    [],
  );

  const styles =
    variant === "hero"
      ? {
          wrap: "text-white",
          primary:
            "border-brand-gold bg-brand-gold text-brand-navy hover:brightness-105",
          secondary:
            "border-white/30 bg-brand-navy/80 text-white hover:border-brand-gold",
          info: "text-white/90",
          trigger:
            "h-8 w-[160px] border-white/30 bg-brand-navy/85 text-white hover:border-brand-gold",
        }
      : {
          wrap: "text-foreground",
          primary:
            "border-brand-gold bg-brand-gold text-brand-navy hover:brightness-105",
          secondary:
            "border-border bg-background text-foreground hover:border-brand-gold",
          info: "text-muted-foreground",
          trigger: "h-8 w-[160px]",
        };

  const requesting = loc.status === "prompting";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${styles.wrap} ${className}`}>
      <button
        type="button"
        onClick={loc.requestGeolocation}
        disabled={requesting}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.14em] transition-colors disabled:opacity-70 ${
          loc.status === "granted" ? styles.secondary : styles.primary
        }`}
        aria-label="Usar minha localização atual"
      >
        <Navigation className="h-3.5 w-3.5" aria-hidden />
        {requesting
          ? "Localizando…"
          : loc.status === "granted"
            ? "Atualizar localização"
            : "Perto de mim"}
      </button>

      {(loc.status === "denied" || loc.status === "unavailable" || loc.status === "manual") && (
        <Select
          value={loc.neighborhoodKey ?? ""}
          onValueChange={(v) => {
            const label = NEIGHBORHOOD_LABELS_BY_KEY[v] ?? v;
            loc.setManualNeighborhood(label);
          }}
        >
          <SelectTrigger aria-label="Escolher meu bairro" className={styles.trigger}>
            <MapPin className="mr-1 h-3.5 w-3.5" aria-hidden />
            <SelectValue placeholder="Escolher bairro" />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.key} value={o.key}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {loc.hasReference && (
        <button
          type="button"
          onClick={loc.clear}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${styles.secondary}`}
          title="Remover referência de localização"
        >
          <X className="h-3 w-3" aria-hidden /> Limpar
        </button>
      )}

      {loc.errorMessage && (
        <span className={`text-[11px] ${styles.info}`}>{loc.errorMessage}</span>
      )}
    </div>
  );
}
