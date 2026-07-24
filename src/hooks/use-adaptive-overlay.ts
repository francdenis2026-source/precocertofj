import { useEffect, useState } from "react";

/**
 * Sample average luminance of an image and return an overlay opacity that
 * keeps foreground text legible (WCAG-friendly). Brighter backgrounds get a
 * heavier overlay, darker ones a lighter overlay.
 *
 * @param src image URL
 * @param opts.min minimum overlay opacity (0–1), default 0.55
 * @param opts.max maximum overlay opacity (0–1), default 0.94
 */
export function useAdaptiveOverlayOpacity(
  src: string,
  opts: { min?: number; max?: number } = {},
): number {
  const { min = 0.55, max = 0.94 } = opts;
  const [opacity, setOpacity] = useState<number>((min + max) / 2);

  useEffect(() => {
    if (typeof window === "undefined" || !src) return;
    let cancelled = false;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      try {
        const w = 32;
        const h = Math.max(1, Math.round((img.height / img.width) * w));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        let sum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] / 255;
          const g = data[i + 1] / 255;
          const b = data[i + 2] / 255;
          // Rec. 709 relative luminance
          sum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
          count++;
        }
        const luminance = count ? sum / count : 0.5;
        // Map luminance [0..1] -> opacity [min..max]
        const next = min + (max - min) * Math.min(1, Math.max(0, luminance));
        setOpacity(Number(next.toFixed(3)));
      } catch {
        // CORS or canvas taint: keep default
      }
    };

    return () => {
      cancelled = true;
      img.onload = null;
    };
  }, [src, min, max]);

  return opacity;
}
