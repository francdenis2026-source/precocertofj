import { motion } from "framer-motion";
import { Image, FileArchive, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoPreview {
  name: string;
  path: string;
}

interface LogoPreviewListProps {
  logos: LogoPreview[];
  onClose: () => void;
}

export function LogoPreviewList({ logos, onClose }: LogoPreviewListProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-4xl max-h-[80vh] bg-[var(--bg-surface)] rounded-[32px] border border-[var(--border-subtle)] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-base)]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
              <FileArchive className="w-5 h-5 text-[var(--brand-primary)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Conteúdo do Pacote</h2>
              <p className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider">{logos.length} arquivos prontos para download</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/5">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 scrollbar-hide">
          {logos.map((logo, idx) => (
            <motion.div
              key={logo.path}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
              className="group relative flex flex-col gap-3 p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/30 transition-all"
            >
              <div className="aspect-square w-full rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center overflow-hidden p-4 group-hover:bg-white/[0.05] transition-colors">
                {logo.path.endsWith('.svg') || logo.path.endsWith('.png') || logo.path.endsWith('.webp') ? (
                  <img 
                    src={logo.path} 
                    alt={logo.name} 
                    className="max-w-full max-h-full object-contain filter drop-shadow-lg"
                  />
                ) : (
                  <Image className="w-8 h-8 text-[var(--text-tertiary)]" />
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[var(--text-primary)] truncate" title={logo.name}>
                  {logo.name}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                  {logo.path.split('.').pop()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="p-6 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-full px-8">
            Fechar
          </Button>
          <a href="/logomarcas-precocerto.zip" download>
            <Button className="rounded-full px-8 bg-[var(--brand-primary)] text-black font-bold">
              Baixar ZIP
            </Button>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
