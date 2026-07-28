/**
 * Testes de UI para <AdminBreadcrumb />: garante que a trilha exibe
 * Admin › Hub › Página, aplica data-tone semântico e marca a página
 * atual com aria-current para leitores de tela.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, Outlet } from "@tanstack/react-router";
import { AdminBreadcrumb, ADMIN_HUBS, type AdminHubKey } from "@/components/admin/AdminBreadcrumb";

function renderWithRouter(ui: React.ReactNode) {
  const root = createRootRoute({ component: () => <Outlet /> });
  const index = createRoute({ getParentRoute: () => root, path: "/", component: () => <>{ui}</> });
  const router = createRouter({
    routeTree: root.addChildren([index]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(<RouterProvider router={router} />);
}

describe("AdminBreadcrumb", () => {
  it("renderiza trilha Admin › Hub › Página com aria-current na atual", async () => {
    renderWithRouter(<AdminBreadcrumb hub="contas" page="Clientes" />);
    expect(await screen.findByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Contas")).toBeInTheDocument();
    const current = screen.getByText("Clientes");
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("propaga data-tone do hub para herança visual", async () => {
    const hubs: AdminHubKey[] = ["contas", "vitrine", "operacao", "precos"];
    for (const hub of hubs) {
      const { unmount, findByTestId } = renderWithRouter(
        <AdminBreadcrumb hub={hub} page="X" />,
      );
      const nav = await findByTestId(`admin-breadcrumb-${hub}`);
      expect(nav.getAttribute("data-tone")).toBe(ADMIN_HUBS[hub].tone);
      unmount();
    }
  });

  it("usa currentLabel quando fornecido em vez do page", async () => {
    renderWithRouter(
      <AdminBreadcrumb hub="operacao" page="raw" currentLabel="Cesta Básica" />,
    );
    expect(await screen.findByText("Cesta Básica")).toBeInTheDocument();
  });
});
