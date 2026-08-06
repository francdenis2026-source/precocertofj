import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PlusCircle, Camera, Search, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/registrar")({
  head: () => ({
    meta: [
      { title: "Registrar Preço — PreçoCerto" },
      { name: "description", content: "Contribua com a comunidade registrando preços de produtos." }
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-24">
      <SiteHeader variant="solid" showThemeToggle />
      <main className="mx-auto w-full max-w-xl px-4 py-8">
        <div className="flex flex-col gap-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-display font-bold text-white">Registrar Preço</h1>
            <p className="text-[var(--text-tertiary)] text-sm">
              Ajude a manter os preços atualizados em Feijó.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-4">
            <button className="flex items-center gap-4 p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--brand-primary)] transition-all group">
              <div className="h-12 w-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--brand-primary)] group-hover:scale-110 transition-transform">
                <Camera className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white">Escanear Código</h3>
                <p className="text-xs text-[var(--text-tertiary)]">Use a câmera para identificar o produto</p>
              </div>
            </button>

            <button className="flex items-center gap-4 p-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl hover:border-[var(--brand-primary)] transition-all group">
              <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center text-[var(--text-secondary)] group-hover:scale-110 transition-transform">
                <Search className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-white">Buscar Manualmente</h3>
                <p className="text-xs text-[var(--text-tertiary)]">Digite o nome do produto ou marca</p>
              </div>
            </button>
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-2">Dica</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Ao registrar um preço, verifique se a data de validade e a unidade de medida (kg, un, ml) estão corretas para garantir a melhor comparação para todos.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
