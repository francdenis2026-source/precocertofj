import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromoUploadModal } from "./PromoUploadModal";

export function PromoBanner() {
  const [modalOpen, setModalOpen] = React.useState(false);

  return (
    <div className="relative group">
      {/* Background Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-[var(--brand-primary)] via-indigo-500 to-[var(--brand-primary)] rounded-[24px] blur opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
      
      <motion.div 
        whileHover={{ y: -2 }}
        className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-[22px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--pc-shadow-lg)] overflow-hidden"
      >
        {/* Animated Background Decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[var(--brand-primary)]/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000 pointer-events-none"></div>
        
        <div className="relative z-10 flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
            <Gift className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)]">Presente pra você</span>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
              30 dias <span className="text-[var(--brand-primary)]">grátis</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] font-medium max-w-sm">
              Envie sua 1ª nota e ganhe acesso total por um mês.
            </p>
          </div>
        </div>

        <div className="relative z-10 shrink-0 w-full md:w-auto">
          <Button 
            onClick={() => setModalOpen(true)}
            className="group/btn relative w-full md:w-auto h-14 px-8 rounded-xl bg-[var(--brand-primary)] text-black font-black uppercase tracking-[0.2em] text-[11px] overflow-hidden transition-all duration-300 hover:scale-[1.05] hover:shadow-[0_10px_40px_-10px_var(--brand-primary)] active:scale-95"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <Sparkles className="h-4 w-4 animate-pulse" />
              Enviar Nota Fiscal
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </span>
          </Button>
        </div>
      </motion.div>

      <PromoUploadModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
