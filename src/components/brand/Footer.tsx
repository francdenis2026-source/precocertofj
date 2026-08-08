import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Facebook, Instagram, Twitter, Linkedin, Globe } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]">
      <div className="mx-auto max-w-[1440px] px-4 py-16 md:px-8">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
              <Logo variant="light" className="[&_img]:h-8 [&_img]:w-8 [&_span]:text-[20px]" />
            </Link>
            <p className="max-w-xs text-[15px] leading-relaxed mb-8">
              O PreçoCerto é a maior plataforma de inteligência de compras e economia doméstica de Feijó.
            </p>
            <div className="flex items-center gap-4">
              <SocialLink Icon={Instagram} />
              <SocialLink Icon={Facebook} />
              <SocialLink Icon={Twitter} />
            </div>
          </div>

          {/* Column 1 */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-[var(--text-primary)] mb-6">PreçoCerto</h4>
            <ul className="space-y-4 text-[15px]">
              <li><FooterLink to="/sobre">Sobre nós</FooterLink></li>
              <li><FooterLink to="/como-funciona">Como funciona</FooterLink></li>
              <li><FooterLink to="/contato">Contato</FooterLink></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-[var(--text-primary)] mb-6">Produto</h4>
            <ul className="space-y-4 text-[15px]">
              <li><FooterLink to="/precos">Comparar Preços</FooterLink></li>
              <li><FooterLink to="/cesta">Cesta Inteligente</FooterLink></li>
              <li><FooterLink to="/estabelecimentos">Mercados</FooterLink></li>
              <li><FooterLink to="/planos">Planos Premium</FooterLink></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-widest text-[var(--text-primary)] mb-6">Legal</h4>
            <ul className="space-y-4 text-[15px]">
              <li><FooterLink to="/privacidade">Privacidade</FooterLink></li>
              <li><FooterLink to="/termos">Termos de Uso</FooterLink></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2 text-[12px] font-bold tracking-widest text-[var(--text-primary)]">
              SKAES NET TECHNOLOGY
              <span className="h-1 w-1 rounded-full bg-[var(--brand-primary)]" />
              FRANC D'NIS
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Feijó · Acre · Brasil
            </p>
          </div>

          <div className="text-[13px] font-medium text-[var(--text-tertiary)] flex items-center gap-2">
            <span>© {year} PreçoCerto. Todos os direitos reservados.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link 
      to={to} 
      className="transition-colors hover:text-[var(--brand-primary)]"
    >
      {children}
    </Link>
  );
}

function SocialLink({ Icon }: { Icon: any }) {
  return (
    <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition-all hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)]">
      <Icon className="h-4.5 w-4.5" />
    </button>
  );
}
