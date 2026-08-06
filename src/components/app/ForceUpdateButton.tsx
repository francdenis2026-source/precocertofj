import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { forceAppUpdate, APP_BUILD_ID } from "@/lib/app-version";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Ação manual para forçar a atualização do site depois de um Publish:
 * limpa caches, remove service workers antigos e recarrega o app na hora.
 */
export function ForceUpdateButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    toast.loading("Buscando a versão mais recente…", { id: "force-update" });
    try {
      await forceAppUpdate();
    } catch {
      toast.error("Não foi possível atualizar agora. Tente novamente.", {
        id: "force-update",
      });
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      onClick={run}
      disabled={busy}
      title={`Versão atual: ${APP_BUILD_ID}`}
      aria-label="Forçar atualização do site e recarregar"
      className={cn(
        "h-7 rounded-md border border-black/30 bg-black/10 px-2 text-[11px] font-medium text-black shadow-none hover:bg-black/20 disabled:opacity-60",
        className,
      )}

    >
      <RefreshCw
        className={cn("h-3.5 w-3.5", busy && "animate-spin")}
        aria-hidden
      />
      <span className="hidden md:inline">
        {busy ? "Atualizando…" : "Atualizar"}
      </span>
    </Button>
  );
}
