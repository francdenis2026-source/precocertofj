import morningImg from "@/assets/login/morning.jpg";
import afternoonImg from "@/assets/login/afternoon.jpg";
import eveningImg from "@/assets/login/evening.jpg";
import nightImg from "@/assets/login/night.jpg";

export type EditorialSlot = "morning" | "afternoon" | "evening" | "night";

export type EditorialBackground = {
  slot: EditorialSlot;
  src: string;
  label: string;
  /** Recommended overlay tint for legibility over this variant. */
  overlay: string;
};

const CATALOG: Record<EditorialSlot, Omit<EditorialBackground, "slot">> = {
  morning: {
    src: morningImg,
    label: "Manhã · feira local",
    overlay:
      "linear-gradient(125deg, rgba(10,28,45,0.78) 0%, rgba(15,60,80,0.55) 45%, rgba(6,80,72,0.42) 100%)",
  },
  afternoon: {
    src: afternoonImg,
    label: "Tarde · praça de mercado",
    overlay:
      "linear-gradient(125deg, rgba(14,32,52,0.76) 0%, rgba(18,70,90,0.52) 50%, rgba(8,90,80,0.40) 100%)",
  },
  evening: {
    src: eveningImg,
    label: "Entardecer · corredor",
    overlay:
      "linear-gradient(125deg, rgba(20,24,42,0.80) 0%, rgba(45,22,55,0.55) 50%, rgba(90,32,44,0.42) 100%)",
  },
  night: {
    src: nightImg,
    label: "Noite · prateleira iluminada",
    overlay:
      "linear-gradient(125deg, rgba(10,20,34,0.84) 0%, rgba(14,42,62,0.62) 50%, rgba(6,64,64,0.48) 100%)",
  },
};

export function slotForHour(hour: number): EditorialSlot {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/**
 * Pick a background variant based on the caller's local time.
 * SSR-safe: returns "morning" when Date is unavailable.
 */
export function pickEditorialBackground(now: Date = new Date()): EditorialBackground {
  const slot = slotForHour(now.getHours());
  return { slot, ...CATALOG[slot] };
}

export function getEditorialBackground(slot: EditorialSlot): EditorialBackground {
  return { slot, ...CATALOG[slot] };
}

export const ALL_EDITORIAL_SLOTS: EditorialSlot[] = ["morning", "afternoon", "evening", "night"];
