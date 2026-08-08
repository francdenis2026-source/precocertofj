import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Menu, X, ArrowRight } from "lucide-react";

interface SiteHeaderProps {
  variant?: "solid" | "overlay";
}

export function SiteHeader({ variant = "solid" }: SiteHeaderProps) {
  const { session } = useMyProfile();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isOverlay = variant === "overlay" && !isScrolled && !mobileMenuOpen;

  const navLinks = [
    { label: "Comparar preços", to: "/precos" },
    { label: "Mercados", to: "/estabelecimentos" },
    { label: "Cesta inteligente", to: "/cesta" },
    { label: "Planos", to: "/planos" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-300",
          isScrolled ? "bg-white/80 backdrop-blur-md border-b border-[var(--border-subtle)] shadow-sm" : "bg-transparent",
          !isOverlay && "bg-white border-b border-[var(--border-subtle)]"
        )}
      >
        <div className="mx-auto max-w-[1280px] h-full px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="relative z-50">
              <Logo 
                variant={isOverlay ? "on-dark" : "on-light"} 
                className="[&_img]:h-8 [&_img]:w-8 [&_span]:text-[20px]" 
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "text-[14px] font-bold tracking-tight transition-colors hover:text-[var(--brand-primary)]",
                    isOverlay ? "text-white/90 hover:text-white" : "text-[var(--text-secondary)]",
                    pathname === link.to && (isOverlay ? "text-white" : "text-[var(--brand-primary)]")
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {!session ? (
              <>
                <Link
                  to="/login"
                  className={cn(
                    "hidden md:block text-[14px] font-bold tracking-tight px-4 py-2 transition-colors",
                    isOverlay ? "text-white hover:text-white/80" : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  )}
                >
                  Entrar
                </Link>
                <Button asChild className="pc-button-primary rounded-full px-6 h-10 text-[13px] font-bold shadow-lg shadow-[var(--brand-primary)]/20">
                  <Link to="/cadastro">Começar grátis</Link>
                </Button>
              </>
            ) : (
              <Button asChild className="pc-button-primary rounded-full px-6 h-10 text-[13px] font-bold">
                <Link to="/app">Minha área</Link>
              </Button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "lg:hidden relative z-50 p-2",
                isOverlay ? "text-white" : "text-[var(--text-primary)]"
              )}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white pt-[72px] px-6 lg:hidden"
          >
            <nav className="flex flex-col gap-6 pt-10">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-2xl font-black text-[var(--text-primary)] flex items-center justify-between group"
                >
                  {link.label}
                  <ArrowRight className="text-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
              <div className="mt-10 pt-10 border-t border-[var(--border-subtle)] flex flex-col gap-4">
                {!session && (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-lg font-bold text-[var(--text-secondary)]"
                    >
                      Entrar na conta
                    </Link>
                    <Button asChild className="pc-button-primary rounded-2xl h-14 text-lg">
                      <Link to="/cadastro" onClick={() => setMobileMenuOpen(false)}>Começar grátis</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
