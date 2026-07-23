import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Alias público /produto/$slug → /produto-publico/$slug.
 * Mantém URLs curtas em cards e cria um caminho canônico para links externos,
 * enquanto reaproveita a página pública já existente (com histórico, gráfico
 * de preços por mercado e ranking por cidade).
 */
export const Route = createFileRoute("/produto/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/produto-publico/$slug",
      params: { slug: params.slug },
      replace: true,
    });
  },
});
