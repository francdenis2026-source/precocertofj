import { Zap, Wallet, MapPin, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const BENEFITS = [
  { 
    icon: Wallet, 
    title: "Economia Real", 
    desc: "Compare preços em segundos e descubra o menor valor da semana.",
    color: "var(--success)"
  },
  { 
    icon: Zap, 
    title: "Tempo Real", 
    desc: "Dados atualizados continuamente para você não perder nenhuma oferta.",
    color: "var(--brand-accent)"
  },
  { 
    icon: MapPin, 
    title: "Feito para Feijó", 
    desc: "Inteligência de mercado local focada nos estabelecimentos da nossa cidade.",
    color: "var(--brand-primary)"
  },
  { 
    icon: ShieldCheck, 
    title: "Dados Verificados", 
    desc: "Algoritmos de auditoria garantem a precisão das informações exibidas.",
    color: "var(--info)"
  },
];

export function BenefitsSection() {
  return (
    <section className="py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {BENEFITS.map((b, i) => (
          <motion.article
            key={b.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group p-8 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] hover:border-[var(--brand-primary)]/30 transition-all duration-300 shadow-sm hover:shadow-xl"
          >
            <div 
              className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-6 transition-transform group-hover:scale-110 duration-300"
              style={{ background: `color-mix(in oklab, ${b.color} 12%, transparent)`, color: b.color }}
            >
              <b.icon className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <h3 className="text-[20px] font-bold tracking-tight text-[var(--text-primary)] mb-3">
              {b.title}
            </h3>
            <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
              {b.desc}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
