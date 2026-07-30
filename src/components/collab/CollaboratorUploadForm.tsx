import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, X, Image as ImageIcon, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createCollaboratorSubmission } from "@/lib/collab-submit.functions";
import { useMyProfile } from "@/hooks/useMyProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LocalFile = {
  file: File;
  path: string;
  previewUrl: string;
  uploaded: boolean;
  uploading: boolean;
  error?: string;
};

const MAX_FILES = 10;
const MAX_SIZE_MB = 8;

export function CollaboratorUploadForm({ embedded = false }: { embedded?: boolean } = {}) {
  const { session } = useMyProfile();
  const userId = session?.user?.id;
  const submitFn = useServerFn(createCollaboratorSubmission);
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [market, setMarket] = useState("");
  const [city, setCity] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);

  const submit = useMutation({
    mutationFn: async () => {
      const uploaded = files.filter((f) => f.uploaded);
      if (uploaded.length === 0) throw new Error("Anexe ao menos 1 imagem da nota.");
      return submitFn({
        data: {
          market_name: market.trim(),
          city: city.trim() || undefined,
          purchase_date: purchaseDate || undefined,
          notes: notes.trim() || undefined,
          attachment_paths: uploaded.map((f) => f.path),
        },
      });
    },
    onSuccess: () => {
      toast.success("Envio recebido! Você será notificado quando for revisado.");
      setMarket("");
      setCity("");
      setPurchaseDate("");
      setNotes("");
      setFiles((prev) => {
        for (const f of prev) URL.revokeObjectURL(f.previewUrl);
        return [];
      });
      qc.invalidateQueries({ queryKey: ["my-collab-submissions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao enviar."),
  });

  if (!userId) return null;

  async function uploadOne(f: LocalFile, index: number) {
    setFiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], uploading: true, error: undefined };
      return next;
    });
    const { error } = await supabase.storage
      .from("collab-receipts")
      .upload(f.path, f.file, { cacheControl: "3600", upsert: false });
    setFiles((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        uploading: false,
        uploaded: !error,
        error: error?.message,
      };
      return next;
    });
    if (error) toast.error(`Upload falhou: ${error.message}`);
  }

  function handlePick(list: FileList | null) {
    if (!list || !userId) return;
    const room = MAX_FILES - files.length;
    if (room <= 0) {
      toast.error(`Máximo ${MAX_FILES} arquivos por envio.`);
      return;
    }
    const picked = Array.from(list).slice(0, room);
    const next: LocalFile[] = [];
    for (const file of picked) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`"${file.name}" excede ${MAX_SIZE_MB}MB.`);
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      next.push({
        file,
        path,
        previewUrl: URL.createObjectURL(file),
        uploaded: false,
        uploading: false,
      });
    }
    if (next.length === 0) return;
    setFiles((prev) => {
      const combined = [...prev, ...next];
      // dispara upload de cada novo arquivo
      next.forEach((f) => {
        const idx = combined.indexOf(f);
        void uploadOne(f, idx);
      });
      return combined;
    });
  }

  function removeAt(i: number) {
    const target = files[i];
    if (target?.uploaded) {
      void supabase.storage.from("collab-receipts").remove([target.path]);
    }
    URL.revokeObjectURL(target.previewUrl);
    setFiles((prev) => prev.filter((_, k) => k !== i));
  }

  const anyUploading = files.some((f) => f.uploading);
  const uploadedCount = files.filter((f) => f.uploaded).length;
  const canSubmit =
    !submit.isPending &&
    !anyUploading &&
    uploadedCount > 0 &&
    market.trim().length >= 2;

  return (
    <section
      aria-labelledby="upload-title"
      className={
        embedded
          ? ""
          : "mt-6 rounded-xl border border-border bg-card p-4 shadow-elev-1 md:p-5"
      }
    >
      {!embedded && (
        <div className="mb-3">
          <h2
            id="upload-title"
            className="flex items-center gap-2 text-[15.5px] font-semibold tracking-tight text-foreground"
          >
            <Upload className="h-4 w-4 text-gold-ink" strokeWidth={2.2} />
            Enviar direto pelo app
          </h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
            Suas fotos são anexadas ao envio e revisadas pela equipe — sem precisar abrir o e-mail.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">

        <div>
          <Label htmlFor="collab-market">Mercado / estabelecimento *</Label>
          <Input
            id="collab-market"
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            placeholder="Ex.: Supermercado Wanderley"
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="collab-city">Cidade</Label>
          <Input
            id="collab-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex.: Feijó/AC"
            maxLength={80}
          />
        </div>
        <div>
          <Label htmlFor="collab-date">Data da compra</Label>
          <Input
            id="collab-date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="collab-notes">Observações (opcional)</Label>
          <Textarea
            id="collab-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex.: Nota do dia da promoção de carnes"
            maxLength={1000}
          />
        </div>
      </div>

      <div className="mt-4">
        <Label>Fotos das notas fiscais * (até {MAX_FILES}, {MAX_SIZE_MB}MB cada)</Label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handlePick(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={files.length >= MAX_FILES}
            className="gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            Escolher fotos
          </Button>
          {files.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {uploadedCount}/{files.length} enviadas
            </span>
          )}
        </div>

        {files.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-5">
            {files.map((f, i) => (
              <div
                key={f.path}
                className="relative overflow-hidden rounded-lg border bg-muted/40"
              >
                <img
                  src={f.previewUrl}
                  alt={`Prévia ${i + 1}`}
                  className="h-24 w-full object-cover"
                />
                {f.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}
                {f.uploaded && (
                  <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                    OK
                  </span>
                )}
                {f.error && (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-rose-600/90 px-1 py-0.5 text-[11px] font-medium text-white">
                    {f.error}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label="Remover"
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        <Button
          onClick={() => submit.mutate()}
          disabled={!canSubmit}
          className="gap-2"
        >
          {submit.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar comprovantes
        </Button>
      </div>
    </section>
  );
}
