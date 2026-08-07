import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { AppShell } from "@/components/brand/AppShell";
import { AdminHubLauncher, type HubSection } from "@/components/admin/AdminHubLauncher";
import {
  BadgeDollarSign,
  Wallet,
  Plug,
  Webhook,
  Mail,
  Sparkles,
  ClipboardList,
  Eraser,
} from "lucide-react";
import { CommercialUpdateDialog } from "@/components/admin/CommercialUpdateDialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin_/operacao")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Sistema & Operação — Admin PreçoCerto" },
      {
        name: "description",
        content:
          "Configuração da plataforma: planos, assinantes, integrações, webhooks, e-mails, IA e auditoria administrativa.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AppShell scope="admin">
      <OperacaoHubPage />
    </AppShell>
  ),
});

const SECTIONS: HubSection[] = [
  {
    key: "comercial",
    title: "Comercial",
    description: "Monetização e ciclo de assinatura",
    items: [
      {
        key: "planos",
        title: "Planos & licenças",
        description: "Preços, duração e regras de degustação — refletem em /planos e nos cards da home.",
        icon: BadgeDollarSign,
        to: "/admin",
        search: { tab: "plans" },
        primary: true,
      },
      {
        key: "assinantes",
        title: "Assinantes",
        description: "Assinaturas ativas, cadastro manual e verificação por código.",
        icon: Wallet,
        to: "/admin",
        search: { tab: "subscribers" },
      },
    ],
  },
  {
    key: "integracoes",
    title: "Integrações",
    description: "Conexões com serviços externos",
    items: [
      {
        key: "integrations",
        title: "Integrações",
        description: "Chaves, provedores conectados e status de credenciais.",
        icon: Plug,
        to: "/admin",
        search: { tab: "integrations" },
      },
      {
        key: "webhooks",
        title: "Webhooks Mercado Pago",
        description: "Eventos recebidos, assinaturas, status e reprocessamento manual.",
        icon: Webhook,
        to: "/admin_/webhooks",
      },
      {
        key: "emails",
        title: "E-mails transacionais",
        description: "Templates, envios e retries de e-mails da plataforma.",
        icon: Mail,
        to: "/admin",
        search: { tab: "emails" },
      },
    ],
  },
  {
    key: "plataforma",
    title: "Plataforma",
    description: "Regras da experiência interna",
    items: [
      {
        key: "ia",
        title: "Configurações de IA",
        description: "Cota mensal por plano e regras de acesso ao assistente de IA.",
        icon: Sparkles,
        to: "/admin_/ia",
      },
    ],
  },
  {
    key: "auditoria",
    title: "Auditoria & higiene",
    description: "Trilha de ações e limpeza controlada",
    items: [
      {
        key: "audit-admin",
        title: "Auditoria administrativa",
        description: "Ações executadas por admins (admin_audit_log) — sem misturar catálogo.",
        icon: ClipboardList,
        to: "/admin_/auditoria",
        search: { tab: "admin" },
      },
      {
        key: "limpar-logs",
        title: "Limpeza de logs",
        description: "Truncar logs de auditoria e eventos com dupla confirmação por escopo.",
        icon: Eraser,
        to: "/admin_/auditoria",
        search: { tab: "limpeza" },
        badge: "atenção",
        badgeTone: "alert",
      },
    ],
  },
];

function OperacaoHubPage() {
  const [openCommercial, setOpenCommercial] = useState(false);

  return (
    <>
      <AdminHubLauncher
        eyebrow="Hub · Operação"
        title="Sistema & Operação"
        description="Configuração da plataforma isolada do dia-a-dia: comercial, integrações, plataforma e auditoria administrativa."
        tone="system"
        sections={SECTIONS}
        headerCta={{ label: "← Dashboard admin", to: "/admin" }}
        onCommercialUpdate={() => setOpenCommercial(true)}
      />

      <CommercialUpdateDialog
        open={openCommercial}
        onOpenChange={setOpenCommercial}
        establishmentId="555544d3-d211-4125-8bdb-70351e768b63"
        establishmentName="Comercial Vanderley"
      />
    </>
  );
}
