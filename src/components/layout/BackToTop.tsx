import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-4 right-4 z-40 grid h-10 w-10 place-items-center rounded-full border shadow-lg transition-all sm:bottom-6 sm:right-6"
      style={{
        background: "var(--pc-home-heading)",
        color: "var(--pc-home-paper)",
        borderColor: "var(--pc-home-line)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <ArrowUp className="h-4 w-4" strokeWidth={2.4} />
    </button>
  );
}
