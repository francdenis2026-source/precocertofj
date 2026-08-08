import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Facebook, Instagram, Twitter } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#E5EAF1] bg-[#F8FAFC] text-[#64748B]">
      <div className="mx-auto max-w-[1280px] px-4 py-12 md:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand Info */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
              <Logo variant="on-light" className="[&_img]:h-7 [&_img]:w-7 [&_span]:text-[18px]" />
            </Link>
            <p className="max-w-xs text-[14px] leading-relaxed mb-6">
              A maior plataforma de inteligência de compras de Feijó. Compare preços e economize de verdade.
            </p>
            <div className="flex items-center gap-3">
              <SocialLink Icon={Instagram} />
              <SocialLink Icon={Facebook} />
              <SocialLink Icon={Twitter} />
            </div>
          </div>

          {/* PreçoCerto */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0F172A] mb-5">PreçoCerto</h4>
            <ul className="space-y-3 text-[14px]">
              <li><FooterLink to="/sobre">Sobre</FooterLink></li>
              <li><FooterLink to="/como-funciona">Como funciona</FooterLink></li>
              <li><FooterLink to="/contato">Contato</FooterLink></li>
            </ul>
          </div>

          {/* Produto */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0F172A] mb-5">Produto</h4>
            <ul className="space-y-3 text-[14px]">
              <li><FooterLink to="/precos">Comparar preços</FooterLink></li>
              <li><FooterLink to="/cesta">Cesta inteligente</FooterLink></li>
              <li><FooterLink to="/estabelecimentos">Mercados</FooterLink></li>
              <li><FooterLink to="/planos">Planos</FooterLink></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#0F172A] mb-5">Legal</h4>
            <ul className="space-y-3 text-[14px]">
              <li><FooterLink to="/privacidade">Privacidade</FooterLink></li>
              <li><FooterLink to="/termos">Termos</FooterLink></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-[#E5EAF1] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-[#0F172A]">
              SKAES NET TECHNOLOGY
              <span className="h-1 w-1 rounded-full bg-[#2563EB]" />
              FRANC D'NIS
            </div>
            <p className="text-[9px] uppercase tracking-widest text-[#94A3B8] font-bold">
              Feijó · AC · {year}
            </p>
          </div>

          <div className="text-[12px] font-medium text-[var(--text-tertiary)]">
            <span>© PreçoCerto. Todos os direitos reservados.</span>
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
      className="transition-colors hover:text-[#2563EB]"
    >
      {children}
    </Link>
  );
}

function SocialLink({ Icon }: { Icon: any }) {
  return (
    <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5EAF1] bg-white text-[#64748B] transition-all hover:bg-[#2563EB] hover:text-white hover:border-[#2563EB]">
      <Icon className="h-4 w-4" />
    </button>
  );
}
