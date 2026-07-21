import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Página unificada: /comprar-licenca redireciona para /planos.
 * Mantém a mesma experiência de navegação e evita duplicidade.
 */
export const Route = createFileRoute("/comprar-licenca")({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/planos",
      search: (search ?? {}) as Record<string, unknown>,
      replace: true,
    });
  },
  component: () => null,
});
