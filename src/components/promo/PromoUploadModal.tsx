import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle2, Loader2, FileText, X } from "lucide-react";
import { submitPromoReceipt } from "@/lib/promo.functions";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface PromoUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromoUploadModal({ open, onOpenChange }: PromoUploadModalProps) {
  const submitFn = useServerFn(submitPromoReceipt);
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  
  const [formData, setFormData] = React.useState({
    fullName: "",
    cpf: "",
    phone: "",
    email: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Por favor, selecione uma nota fiscal.");
      return;
    }

    setLoading(true);
    try {
      // Simulação de leitura de arquivo para base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const fileBase64 = await base64Promise;

      const result = await submitFn({
        data: {
          ...formData,
          fileBase64,
          fileName: file.name,
        }
      });

      if (result.success) {
        setSuccess(true);
        toast.success("Nota enviada com sucesso!");
      }
    } catch (err) {
      toast.error("Erro ao enviar nota. Tente novamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!loading) {
        onOpenChange(val);
        if (!val) {
          // Reset after animation
          setTimeout(() => {
            setSuccess(false);
            setFile(null);
            setFormData({ fullName: "", cpf: "", phone: "", email: "" });
          }, 300);
        }
      }
    }}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden bg-[var(--bg-surface)] border-[var(--border-subtle)]">
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[var(--brand-primary)]">
                  <Upload className="h-5 w-5" />
                  Enviar Nota Fiscal
                </DialogTitle>
                <DialogDescription className="text-[var(--text-secondary)]">
                  Mande sua 1ª nota e use tudo de graça por um mês.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Nome Completo</Label>
                    <Input 
                      id="fullName" 
                      required 
                      placeholder="Ex: João da Silva"
                      value={formData.fullName}
                      onChange={e => setFormData(d => ({ ...d, fullName: e.target.value }))}
                      className="bg-[var(--bg-base)] border-[var(--border-subtle)] focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">CPF</Label>
                      <Input 
                        id="cpf" 
                        required 
                        placeholder="000.000.000-00"
                        value={formData.cpf}
                        onChange={e => setFormData(d => ({ ...d, cpf: e.target.value }))}
                        className="bg-[var(--bg-base)] border-[var(--border-subtle)] focus:ring-[var(--brand-primary)]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Celular</Label>
                      <Input 
                        id="phone" 
                        required 
                        placeholder="(68) 9.9999-9999"
                        value={formData.phone}
                        onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                        className="bg-[var(--bg-base)] border-[var(--border-subtle)] focus:ring-[var(--brand-primary)]"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">E-mail</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      required 
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
                      className="bg-[var(--bg-base)] border-[var(--border-subtle)] focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Arquivo da Nota</Label>
                    <div className="relative">
                      {!file ? (
                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[var(--border-subtle)] rounded-xl cursor-pointer hover:bg-[var(--bg-surface-elevated)] transition-colors group">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="h-6 w-6 text-[var(--text-tertiary)] group-hover:text-[var(--brand-primary)] transition-colors mb-2" />
                            <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Clique para selecionar</p>
                          </div>
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                        </label>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-[var(--bg-base)] border border-[var(--brand-primary)]/30 rounded-xl">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-5 w-5 text-[var(--brand-primary)] shrink-0" />
                            <span className="text-xs font-bold truncate text-[var(--text-primary)]">{file.name}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setFile(null)}
                            className="p-1 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 bg-[var(--brand-primary)] text-black font-black uppercase tracking-widest text-[11px] rounded-xl hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Confirmar Envio"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 flex flex-col items-center text-center"
            >
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-[var(--text-primary)] mb-2 uppercase tracking-tight">Recebido com Sucesso!</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[280px]">
                Sua nota será analisada por nossa equipe. Se estiver tudo certo, você receberá a confirmação por e-mail em até 24h.
              </p>
              <Button 
                onClick={() => onOpenChange(false)}
                className="mt-8 px-8 h-12 rounded-xl border-2 border-[var(--border-subtle)] bg-transparent hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] font-black uppercase tracking-widest text-[11px]"
              >
                Fechar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
