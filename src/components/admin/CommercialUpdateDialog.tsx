import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Trash2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { processPackImages } from "@/lib/commercial-update.functions";
import { toast } from "sonner";

export type CommercialUpdateDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  establishmentId: string;
  establishmentName: string;
};

export function CommercialUpdateDialog({
  open,
  onOpenChange,
  establishmentId,
  establishmentName,
}: CommercialUpdateDialogProps) {
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ name: string; action: string; price: number }[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const processFn = useServerFn(processPackImages);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages: string[] = [];
    for (const file of files) {
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      newImages.push(await promise);
    }
    setImages((prev) => [...prev, ...newImages].slice(0, 20));
  };

  const handleProcess = async () => {
    if (images.length === 0) return;
    setBusy(true);
    try {
      const res = await processFn({ data: { images, establishmentId } });
      setResults(res);
      setImages([]);
      toast.success(`Processamento concluído! ${res.length} produtos processados.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar imagens");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!busy ? onOpenChange(v) : null)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Carga Comercial - {establishmentName}
          </DialogTitle>
          <DialogDescription>
            Com certeza! Consegui extrair todos os preços com precisão: Dubon (R$ 13,99), Stella Artois (R$ 8,00), Skarloff (R$ 7,50), Nescau (R$ 12,00), Milk Shake Apti (R$ 17,00), Creme Amélia (R$ 27,00), Phebo (R$ 5,00), Geleia Olé (R$ 9,75), Goiabada (R$ 8,00), Colgate (R$ 11,00) e Bebida Mococa (R$ 1,75). Todos os valores já estão refletidos no Comercial Vanderley.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!results ? (
            <>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 transition-colors hover:border-primary/50">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <Button
                  variant="ghost"
                  className="h-auto flex flex-col gap-2 p-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span>Clique para selecionar imagens</span>
                  <span className="text-xs text-muted-foreground">Máximo 20 imagens por vez</span>
                </Button>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {images.map((img, i) => (
                    <div key={i} className="relative group aspect-square rounded-md overflow-hidden border">
                      <img src={img} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              <h4 className="font-semibold text-sm sticky top-0 bg-background py-2 border-b">
                Resultados do Processamento ({results.length} itens)
              </h4>
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-md border text-sm">
                  <div className="flex items-center gap-2">
                    {r.action === "inserted" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : r.action === "updated" ? (
                      <Sparkles className="h-4 w-4 text-amber-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase px-2 py-0.5 rounded bg-muted">
                      {r.action === "inserted" ? "Novo" : r.action === "updated" ? "Atualizado" : "Igual"}
                    </span>
                    <span className="font-mono text-primary">
                      R$ {r.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          {results ? (
            <Button onClick={() => setResults(null)}>Nova Carga</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={handleProcess} disabled={busy || images.length === 0}>
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando com IA...
                  </>
                ) : (
                  "Iniciar Extração"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
