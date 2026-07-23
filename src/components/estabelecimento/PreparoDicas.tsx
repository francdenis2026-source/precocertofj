import type { ReactNode } from "react";

type Dica = {
  key: string;
  titulo: string;
  descricao: string;
  cortes: string[];
  icon: ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const DICAS: Dica[] = [
  {
    key: "cozidao",
    titulo: "Cozidão",
    descricao:
      "Cortes com fibras longas e ossos que soltam colágeno. Cozinhe em fogo baixo, com bastante líquido, por tempo prolongado — ideal para caldos encorpados.",
    cortes: [
      "Canela",
      "Peito",
      "Pescoço",
      "Agulha",
      "Pá com osso",
      "Costela",
      "Pé de costela",
    ],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        {/* panela */}
        <path {...stroke} d="M9 20h30l-3 18a3 3 0 0 1-3 2.5H15a3 3 0 0 1-3-2.5L9 20Z" />
        <path {...stroke} d="M6 20h36" />
        <path {...stroke} d="M14 20V16a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v4" />
        {/* vapor */}
        <path {...stroke} d="M20 9c1.5-1.5 1.5-3 0-4.5" />
        <path {...stroke} d="M28 9c1.5-1.5 1.5-3 0-4.5" />
      </svg>
    ),
  },
  {
    key: "assado",
    titulo: "Assado de Panela",
    descricao:
      "Peças magras e uniformes. Sele bem em gordura quente, depois cozinhe tampado com líquido curto até a carne desmanchar ao garfo.",
    cortes: [
      "Coxão duro",
      "Pá sem osso",
      "Peito desossado",
      "Lagarto",
      "Patinho",
      "Coxão mole",
      "Língua",
    ],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        {/* travessa oval */}
        <ellipse {...stroke} cx="24" cy="30" rx="18" ry="7" />
        <path {...stroke} d="M6 30v3a3 3 0 0 0 3 3h30a3 3 0 0 0 3-3v-3" />
        {/* peça de carne */}
        <path {...stroke} d="M14 27c2-4 6-6 10-6s8 2 10 6" />
        <path {...stroke} d="M18 24l2-2M24 22v-2M30 24l-2-2" />
      </svg>
    ),
  },
  {
    key: "churrasco",
    titulo: "Churrasco",
    descricao:
      "Cortes com boa marmorização ou capa de gordura. Fogo forte e brasa firme — deixe descansar antes de fatiar para preservar os sucos.",
    cortes: [
      "Agulha",
      "Maminha",
      "Costela",
      "Alcatra",
      "Bisteca",
      "Picanha",
      "Fraldinha",
      "Contra filé",
      "Cupim",
      "Peito",
    ],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        {/* espeto */}
        <path {...stroke} d="M6 14h36" />
        <path {...stroke} d="M42 14l3-2M42 14l3 2" />
        {/* pedaços */}
        <rect {...stroke} x="10" y="10" width="7" height="8" rx="1.5" />
        <rect {...stroke} x="20" y="10" width="7" height="8" rx="1.5" />
        <rect {...stroke} x="30" y="10" width="7" height="8" rx="1.5" />
        {/* chamas */}
        <path {...stroke} d="M12 40c-2-3 0-5 2-7-1 4 3 4 3 8" />
        <path {...stroke} d="M23 42c-2-3 0-6 2-8-1 4 3 5 3 9" />
        <path {...stroke} d="M34 40c-2-3 0-5 2-7-1 4 3 4 3 8" />
      </svg>
    ),
  },
  {
    key: "strogonoff",
    titulo: "Strogonoff",
    descricao:
      "Cortes macios em tiras finas, no sentido contrário às fibras. Selar rapidamente em fogo alto e finalizar com o creme fora do fogo forte.",
    cortes: ["Alcatra", "Coxão mole", "Filé mignon"],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        {/* frigideira */}
        <path {...stroke} d="M8 22h28a4 4 0 0 1 0 8H14a6 6 0 0 1-6-6v-2Z" />
        <path {...stroke} d="M36 26h6" />
        {/* tirinhas */}
        <path {...stroke} d="M14 20c2-2 5-2 7 0" />
        <path {...stroke} d="M22 18c2-2 5-2 7 0" />
        <path {...stroke} d="M18 15c2-2 5-2 7 0" />
      </svg>
    ),
  },
  {
    key: "ensopado",
    titulo: "Ensopado / Guisado",
    descricao:
      "Cortes ricos em colágeno ou moídos. Refogue bem os temperos, acrescente o líquido aos poucos e cozinhe até o molho encorpar.",
    cortes: ["Músculo", "Rabo bovino", "Carne moída"],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        {/* tigela */}
        <path {...stroke} d="M6 24h36a0 0 0 0 1 0 0 18 18 0 0 1-36 0Z" />
        <path {...stroke} d="M4 24h40" />
        {/* colher */}
        <path {...stroke} d="M36 8l4 4-12 12-4-4Z" />
        {/* pedaços */}
        <circle {...stroke} cx="16" cy="32" r="2" />
        <circle {...stroke} cx="24" cy="36" r="2" />
        <circle {...stroke} cx="32" cy="32" r="2" />
      </svg>
    ),
  },
  {
    key: "grelhado",
    titulo: "Grelhado",
    descricao:
      "Cortes macios em bifes de 2 a 3 cm. Grelha bem quente, sele por poucos minutos de cada lado e evite virar mais que uma vez.",
    cortes: [
      "Contra filé",
      "Alcatra",
      "Coxão mole",
      "Picanha",
      "Cupim",
      "Bife de fígado",
    ],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        {/* grelha */}
        <rect {...stroke} x="6" y="14" width="36" height="20" rx="2" />
        <path {...stroke} d="M6 20h36M6 26h36M6 32h36" />
        <path {...stroke} d="M14 34v4M34 34v4" />
        {/* bife */}
        <path {...stroke} d="M18 23c3-3 9-3 12 0s3 5 0 6H18c-3-1-3-3 0-6Z" />
      </svg>
    ),
  },
];

export function PreparoDicas() {
  return (
    <section
      aria-labelledby="preparo-dicas-title"
      className="mt-10 rounded-2xl border border-border bg-card p-5 sm:p-7"
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Na dúvida?
          </p>
          <h2
            id="preparo-dicas-title"
            className="mt-1 text-xl font-semibold sm:text-2xl"
          >
            Guia de preparo — qual corte usar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sugestões do Recanto da Carne para acertar no corte de acordo com o
            prato.
          </p>
        </div>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DICAS.map((d) => (
          <li
            key={d.key}
            className="flex h-full flex-col gap-3 rounded-xl border border-border/70 bg-background/60 p-4"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"
              >
                {d.icon}
              </span>
              <h3 className="text-base font-semibold">{d.titulo}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{d.descricao}</p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              {d.cortes.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80"
                >
                  {c}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
        Conteúdo cedido por <strong className="text-foreground">Recanto da Carne</strong>.
        Todos os direitos sobre as sugestões de preparo, marca e identidade
        visual pertencem ao estabelecimento. Reprodução apenas com autorização.
      </p>
    </section>
  );
}
