import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Menu, X, ArrowRight, ShoppingBasket, Search, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";

interface SiteHeaderProps {
  variant?: "solid" | "overlay";
}

/**
 * Header Global Consolidado - PreçoCerto
 * Design Moderno, Compacto e Mobile-First.
 */
export function SiteHeader({ variant = "solid" }: SiteHeaderProps) {
  const { session } = useMyProfile();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isOverlay = variant === "overlay" && !isScrolled && !mobileMenuOpen;

  const navLinks = [
    { label: "Comparar preços", to: "/precos" },
    { label: "Cesta inteligente", to: "/cesta" },
    { label: "Estabelecimentos", to: "/estabelecimentos" },
    { label: "Ofertas", to: "/ofertas" },
    { label: "Planos", to: "/planos" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] h-[72px] transition-all duration-500",
          isScrolled 
            ? "bg-white/80 backdrop-blur-xl border-b border-[var(--border-subtle)] shadow-sm" 
            : isOverlay ? "bg-transparent" : "bg-white border-b border-[var(--border-subtle)]"
        )}

      >
        <div className="pc-shell h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo 
              variant={isOverlay ? "on-dark" : "on-light"} 
              className="[&_.pcsb-logo-mark]:h-9 [&_.pcsb-logo-mark]:w-9" 
            />

            <nav className="hidden lg:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "text-[14px] font-semibold transition-colors hover:text-[var(--brand-primary)]",
                    isOverlay ? "text-white/90 hover:text-white" : "text-[var(--text-secondary)]",
                    pathname === link.to && (isOverlay ? "text-white" : "text-[var(--brand-primary)]")
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <Link
                to="/buscar"
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isOverlay ? "text-white/80 hover:bg-white/10" : "text-[var(--text-secondary)] hover:bg-gray-100"
                )}
              >
                <Search size={20} />
              </Link>
              <Link
                to="/cesta"
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isOverlay ? "text-white/80 hover:bg-white/10" : "text-[var(--text-secondary)] hover:bg-gray-100"
                )}
              >
                <ShoppingBasket size={20} />
              </Link>
            </div>

            {!session ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={cn(
                    "hidden sm:block text-[14px] font-semibold px-4 py-2 transition-colors",
                    isOverlay ? "text-white hover:text-white/80" : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  )}
                >
                  Entrar
                </Link>
                <Button asChild className="pc-button-primary rounded-lg px-5 h-10 text-[13px] font-bold">
                  <Link to="/cadastro">Começar grátis</Link>
                </Button>
              </div>
            ) : (
              <Button asChild variant="ghost" className="rounded-full w-10 h-10 p-0 overflow-hidden border border-[var(--border-base)]">
                <Link to="/app" title="Minha área">
                   <User size={20} className={isOverlay ? "text-white" : "text-[var(--text-primary)]"} />
                </Link>
              </Button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                "lg:hidden p-2 rounded-lg transition-colors",
                isOverlay ? "text-white hover:bg-white/10" : "text-[var(--text-primary)] hover:bg-gray-100"
              )}
              aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-[110] bg-navy/20 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-[120] w-[280px] bg-white shadow-2xl lg:hidden flex flex-col"
            >
              <div className="h-[68px] px-6 flex items-center justify-between border-b border-[var(--border-base)]">
                <Logo compact className="[&_.pcsb-logo-mark]:h-8 [&_.pcsb-logo-mark]:w-8" />
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[var(--text-primary)]">
                  <X size={24} />
                </button>
              </div>
              
              <nav className="flex-1 overflow-y-auto py-8 px-6 space-y-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between group"
                  >
                    <span className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                      {link.label}
                    </span>
                    <ArrowRight size={18} className="text-[var(--brand-primary)]" />
                  </Link>
                ))}
              </nav>

              <div className="p-6 border-t border-[var(--border-base)] space-y-3">
                {!session ? (
                  <>
                    <Button asChild className="w-full pc-button-primary h-12 rounded-xl">
                      <Link to="/cadastro" onClick={() => setMobileMenuOpen(false)}>Criar conta gratuita</Link>
                    </Button>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-center text-sm font-bold text-[var(--text-secondary)] py-2"
                    >
                      Já tenho conta · Entrar
                    </Link>
                  </>
                ) : (
                  <Button asChild className="w-full pc-button-primary h-12 rounded-xl">
                    <Link to="/app" onClick={() => setMobileMenuOpen(false)}>Acessar meu painel</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
