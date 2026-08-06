import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SmartSearchBar } from "@/components/home/SmartSearchBar";

export const Route = createFileRoute("/teste-busca")({
  component: TesteBusca,
});

function TesteBusca() {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-10">
      <h1 className="text-2xl font-bold mb-6">Teste da Barra de Busca</h1>
      <div className="w-full max-w-2xl">
        <SmartSearchBar onFocusChange={setIsFocused} />
      </div>
      <div className="mt-4 p-4 border rounded bg-white">
        Estado de foco: {isFocused ? "FOCADO" : "BLURRED"}
      </div>
    </div>
  );
}
