import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { AppShell } from "@/components/brand/AppShell";
import { AdminHubLauncher, type HubSection } from "@/components/admin/AdminHubLauncher";
import { Users, KeyRound, Fingerprint, ShieldCheck, ScrollText } from "lucide-react";

export const Route = createFileRoute("/admin_/contas")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Contas & Clientes — Admin PreçoCerto" },
      {
        name: "description",
        content:
          "Central de pessoas: clientes, senhas & PIN, acessos, equipe interna e auditoria de papéis administrativos.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AppShell scope="admin">
      <ContasHubPage />
    </AppShell>
  ),
});

const SECTIONS: HubSection[] = [
  {
    key: "clientes",
    title: "Clientes",
    description: "Ciclo de vida do usuário final",
    items: [
      {
        key: "clientes-lista",
        title: "Lista de clientes",
        description: "KPIs, filtros, perfil detalhado e licenças ativas por conta.",
        icon: Users,
        to: "/admin_/clientes",
        primary: true,
      },
      {
        key: "clientes-senhas",
        title: "Senhas & PIN",
        description: "Códigos de reset ativos, expirações e reenvio de PIN para clientes.",
        icon: KeyRound,
        to: "/admin_/clientes",
        search: { section: "senhas" },
      },
    ],
  },
  {
    key: "seguranca",
    title: "Segurança & acessos",
    description: "Trilha do login ao papel administrativo",
    items: [
      {
        key: "acessos",
        title: "Acessos & login",
        description: "Eventos de login/logout, falhas de autenticação e IPs recentes.",
        icon: Fingerprint,
        to: "/admin_/auditoria",
        search: { tab: "acessos" },
      },
      {
        key: "equipe",
        title: "Equipe & papéis",
        description: "Conceder ou revogar acesso de admin/moderador para operadores internos.",
        icon: ShieldCheck,
        to: "/admin",
        search: { tab: "users" },
      },
      {
        key: "auditoria-papeis",
        title: "Auditoria de papéis",
        description: "Quem promoveu quem, com carimbo de tempo e IP responsável.",
        icon: ScrollText,
        to: "/admin_/auditoria",
        search: { tab: "auditoria" },
      },
    ],
  },
];

function ContasHubPage() {
  return (
    <AdminHubLauncher
      eyebrow="Hub · Contas"
      title="Contas & Clientes"
      description="Tudo que envolve pessoas, credenciais e permissões — organizado por ciclo de vida da conta."
      tone="people"
      sections={SECTIONS}
      headerCta={{ label: "← Dashboard admin", to: "/admin" }}
    />
  );
}
