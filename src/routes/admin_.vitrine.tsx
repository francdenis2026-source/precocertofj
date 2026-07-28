import { createFileRoute } from "@tanstack/react-router";
import { adminBeforeLoad } from "@/lib/route-guards";
import { AppShell } from "@/components/brand/AppShell";
import { AdminHubLauncher, type HubSection } from "@/components/admin/AdminHubLauncher";
import {
  Store,
  PackageSearch,
  MapPinned,
  Images,
  Languages,
  Palette,
  Tags,
  ShieldAlert,
  History,
} from "lucide-react";

export const Route = createFileRoute("/admin_/vitrine")({
  ssr: false,
  beforeLoad: adminBeforeLoad,
  head: () => ({
    meta: [
      { title: "Estabelecimentos & Catálogo — Admin PreçoCerto" },
      {
        name: "description",
        content:
          "Central de catálogo: estabelecimentos, produtos, cobertura, imagens, taxonomia, consistência e auditoria de mudanças.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AppShell scope="admin">
      <GestaoHubPage />
    </AppShell>
  ),
});

const SECTIONS: HubSection[] = [
  {
    key: "estabelecimentos",
    title: "Estabelecimentos",
    description: "O que aparece na vitrine",
    items: [
      {
        key: "lojas",
        title: "Estabelecimentos",
        description: "CRUD de lojas, marca, endereço, bairros e canais de contato.",
        icon: Store,
        to: "/admin",
        search: { tab: "establishments" },
        primary: true,
      },
      {
        key: "cobertura",
        title: "Cobertura",
        description: "Ranking de cobertura por loja, categorias faltando e cadastros recentes.",
        icon: MapPinned,
        to: "/admin_/cobertura",
      },
    ],
  },
  {
    key: "catalogo",
    title: "Catálogo & mídia",
    description: "Produto, foto e classificação",
    items: [
      {
        key: "produtos",
        title: "Catálogo de produtos",
        description: "Edição, merges, blocklist e curadoria de fichas dos produtos.",
        icon: PackageSearch,
        to: "/admin_/catalogo",
        primary: true,
      },
      {
        key: "imagens",
        title: "Imagens",
        description: "Fila de jobs de imagem, uploads em lote e revisão de fotos.",
        icon: Images,
        to: "/admin_/image-jobs",
      },
    ],
  },
  {
    key: "taxonomia",
    title: "Taxonomia",
    description: "Palavras, ícones e classificação",
    items: [
      {
        key: "sinonimos",
        title: "Sinônimos da busca",
        description: "Grupos canônicos, sinônimos e listas de exclusão da busca.",
        icon: Languages,
        to: "/admin_/sinonimos",
      },
      {
        key: "icones",
        title: "Ícones de categoria",
        description: "Overrides de ícone e cor por categoria do catálogo.",
        icon: Palette,
        to: "/admin_/icones-categoria",
      },
      {
        key: "categorizacao",
        title: "Classificação de produtos",
        description: "Reatribuição em lote de categoria e revisão de outliers.",
        icon: Tags,
        to: "/admin_/categorizacao",
      },
    ],
  },
  {
    key: "qualidade",
    title: "Qualidade de dados",
    description: "Diagnóstico e trilha de mudanças",
    items: [
      {
        key: "consistencia",
        title: "Consistência",
        description: "Diagnósticos numéricos e divergências entre agregados e origem.",
        icon: ShieldAlert,
        to: "/admin_/consistencia",
      },
      {
        key: "auditoria-catalogo",
        title: "Auditoria de catálogo",
        description: "Histórico de edições em product_catalog com autor e diff.",
        icon: History,
        to: "/admin_/auditoria",
        search: { tab: "auditoria" },
      },
    ],
  },
];

function GestaoHubPage() {
  return (
    <AdminHubLauncher
      eyebrow="Hub · Gestão"
      title="Estabelecimentos & Catálogo"
      description="Tudo que descreve o que é vendido e onde — lojas, produtos, fotos, taxonomia e qualidade dos dados."
      tone="catalog"
      sections={SECTIONS}
      headerCta={{ label: "← Dashboard admin", to: "/admin" }}
    />
  );
}
