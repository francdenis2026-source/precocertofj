import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Facebook, Instagram, Twitter, MapPin } from "lucide-react";

/**
 * Footer Global Consolidado - PreçoCerto
 * Fundo Navy da identidade, organizado e compacto.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--navy-900)] text-white/70 overflow-hidden">
      <div className="pc-shell pt-16 pb-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5 mb-16">
          {/* Brand Info */}
          <div className="col-span-2 lg:col-span-2">
            <div className="inline-flex items-center gap-2.5 mb-6">
              <Logo variant="on-dark" className="[&_img]:h-9 [&_img]:w-9 [&_span]:text-[22px]" />
            </div>
            <p className="max-w-xs text-[15px] leading-relaxed mb-8 text-white/60">
              A plataforma definitiva de comparação de preços e inteligência de compras em Feijó, Acre.
            </p>
            <div className="flex items-center gap-4">
              <SocialLink Icon={Instagram} />
              <SocialLink Icon={Facebook} />
              <SocialLink Icon={Twitter} />
            </div>
          </div>

          {/* Atalhos */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-6">Navegação</h4>
            <ul className="space-y-4 text-[14px] font-medium">
              <li><FooterLink to="/precos">Comparar preços</FooterLink></li>
              <li><FooterLink to="/cesta">Cesta inteligente</FooterLink></li>
              <li><FooterLink to="/estabelecimentos">Mercados locais</FooterLink></li>
              <li><FooterLink to="/ofertas">Melhores ofertas</FooterLink></li>
            </ul>
          </div>

          {/* Institucional */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-6">Institucional</h4>
            <ul className="space-y-4 text-[14px] font-medium">
              <li><FooterLink to="/sobre">Quem somos</FooterLink></li>
              <li><FooterLink to="/como-funciona">Como funciona</FooterLink></li>
              <li><FooterLink to="/planos">Planos e Preços</FooterLink></li>
              <li><FooterLink to="/para-empresas">Para empresas</FooterLink></li>
            </ul>
          </div>

          {/* Suporte & Legal */}
          <div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-[14px] font-medium">
              <li><FooterLink to="/privacidade">Privacidade</FooterLink></li>
              <li><FooterLink to="/termos">Termos de uso</FooterLink></li>
              <li><FooterLink to="/contato">Falar conosco</FooterLink></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2.5 text-[11px] font-black tracking-[0.15em] text-white uppercase">
              SKAES NET TECHNOLOGY
              <span className="h-1 w-1 rounded-full bg-primary" />
              FRANC D'NIS
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2 text-[10px] text-white/40 font-bold uppercase tracking-widest">
              <MapPin size={12} className="text-primary" />
              Feijó · Acre · Brasil · {year}
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1">
             <p className="text-[12px] font-semibold text-white/50">
               © PreçoCerto. Todos os direitos reservados.
             </p>
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
      className="transition-colors hover:text-white"
    >
      {children}
    </Link>
  );
}

function SocialLink({ Icon }: { Icon: any }) {
  return (
    <a 
      href="#" 
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/70 transition-all hover:bg-primary hover:text-white hover:-translate-y-1"
    >
      <Icon className="h-5 w-5" />
    </a>
  );
}
