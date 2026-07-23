import type { ReactNode } from "react";
import imgCozidao from "@/assets/preparo/cozidao.jpg";
import imgAssado from "@/assets/preparo/assado.jpg";
import imgChurrasco from "@/assets/preparo/churrasco.jpg";
import imgStrogonoff from "@/assets/preparo/strogonoff.jpg";
import imgEnsopado from "@/assets/preparo/ensopado.jpg";
import imgGrelhado from "@/assets/preparo/grelhado.jpg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Corte = {
  nome: string;
  nota?: string;
};

type Dica = {
  key: string;
  titulo: string;
  descricao: string;
  cortes: Corte[];
  variacoes?: string[];
  icon: ReactNode;
  foto: string;
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
    foto: imgCozidao,
    titulo: "Cozidão",
    descricao:
      "Cortes com fibras longas e ossos que soltam colágeno. Cozinhe em fogo baixo, com bastante líquido, por tempo prolongado — ideal para caldos encorpados.",
    cortes: [
      { nome: "Músculo", nota: "clássico do caldo, solta muito colágeno" },
      { nome: "Acém", nota: "econômico e macio após longo cozimento" },
      { nome: "Peito com osso", nota: "sabor intenso, ótimo para sopas" },
      { nome: "Costela ripa", nota: "gordura equilibrada, desfia fácil" },
      { nome: "Pé de costela" },
      { nome: "Pescoço" },
      { nome: "Rabo bovino" },
      { nome: "Ossobuco (canela)", nota: "tutano cremoso enriquece o caldo" },
      { nome: "Agulha" },
      { nome: "Pá com osso" },
    ],
    variacoes: ["Língua bovina", "Mocotó", "Buchada"],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <path {...stroke} d="M9 20h30l-3 18a3 3 0 0 1-3 2.5H15a3 3 0 0 1-3-2.5L9 20Z" />
        <path {...stroke} d="M6 20h36" />
        <path {...stroke} d="M14 20V16a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v4" />
        <path {...stroke} d="M20 9c1.5-1.5 1.5-3 0-4.5" />
        <path {...stroke} d="M28 9c1.5-1.5 1.5-3 0-4.5" />
      </svg>
    ),
  },
  {
    key: "assado",
    foto: imgAssado,
    titulo: "Assado de Panela",
    descricao:
      "Peças magras e uniformes. Sele bem em gordura quente, depois cozinhe tampado com líquido curto até a carne desmanchar ao garfo.",
    cortes: [
      { nome: "Patinho", nota: "magro, fatia bem sem esfarelar" },
      { nome: "Coxão duro", nota: "clássico do assado, firme e saboroso" },
      { nome: "Coxão mole", nota: "mais macio, ideal para fatias finas" },
      { nome: "Lagarto", nota: "peça uniforme para rosbife e frio" },
      { nome: "Paleta (pá sem osso)", nota: "econômico, desfia fácil" },
      { nome: "Peito desossado" },
      { nome: "Acém", nota: "ótima relação custo-benefício" },
      { nome: "Miolo de acém" },
    ],
    variacoes: ["Chã de dentro", "Ponta de agulha", "Língua"],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <ellipse {...stroke} cx="24" cy="30" rx="18" ry="7" />
        <path {...stroke} d="M6 30v3a3 3 0 0 0 3 3h30a3 3 0 0 0 3-3v-3" />
        <path {...stroke} d="M14 27c2-4 6-6 10-6s8 2 10 6" />
        <path {...stroke} d="M18 24l2-2M24 22v-2M30 24l-2-2" />
      </svg>
    ),
  },
  {
    key: "churrasco",
    foto: imgChurrasco,
    titulo: "Churrasco",
    descricao:
      "Cortes com boa marmorização ou capa de gordura. Fogo forte e brasa firme — deixe descansar antes de fatiar para preservar os sucos.",
    cortes: [
      { nome: "Picanha", nota: "rainha do churrasco, capa de gordura preservada" },
      { nome: "Fraldinha", nota: "fibras longas, muito suculenta" },
      { nome: "Maminha", nota: "macia e discreta, agrada a todos" },
      { nome: "Contra filé (bife ancho)", nota: "marmoreio equilibrado" },
      { nome: "Alcatra", nota: "versátil, aceita bem sal grosso" },
      { nome: "Costela ripa/janela", nota: "assar por horas em brasa baixa" },
      { nome: "Cupim", nota: "gordura entremeada, cozimento longo" },
      { nome: "Bisteca (chuleta)" },
      { nome: "Ponta de agulha" },
      { nome: "Prime rib / ancho" },
    ],
    variacoes: ["Coração de alcatra", "Baby beef", "Denver steak", "Tomahawk"],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <path {...stroke} d="M6 14h36" />
        <path {...stroke} d="M42 14l3-2M42 14l3 2" />
        <rect {...stroke} x="10" y="10" width="7" height="8" rx="1.5" />
        <rect {...stroke} x="20" y="10" width="7" height="8" rx="1.5" />
        <rect {...stroke} x="30" y="10" width="7" height="8" rx="1.5" />
        <path {...stroke} d="M12 40c-2-3 0-5 2-7-1 4 3 4 3 8" />
        <path {...stroke} d="M23 42c-2-3 0-6 2-8-1 4 3 5 3 9" />
        <path {...stroke} d="M34 40c-2-3 0-5 2-7-1 4 3 4 3 8" />
      </svg>
    ),
  },
  {
    key: "strogonoff",
    foto: imgStrogonoff,
    titulo: "Strogonoff",
    descricao:
      "Cortes macios em tiras finas, no sentido contrário às fibras. Selar rapidamente em fogo alto e finalizar com o creme fora do fogo forte.",
    cortes: [
      { nome: "Filé mignon", nota: "opção nobre, extremamente macia" },
      { nome: "Alcatra", nota: "equilíbrio entre sabor e maciez" },
      { nome: "Coxão mole", nota: "econômico, funciona muito bem em tiras" },
      { nome: "Miolo de alcatra" },
      { nome: "Patinho", nota: "magro, cortar bem fino contra a fibra" },
      { nome: "Contra filé" },
    ],
    variacoes: ["Maminha em tiras", "Fraldinha em tiras finas"],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <path {...stroke} d="M8 22h28a4 4 0 0 1 0 8H14a6 6 0 0 1-6-6v-2Z" />
        <path {...stroke} d="M36 26h6" />
        <path {...stroke} d="M14 20c2-2 5-2 7 0" />
        <path {...stroke} d="M22 18c2-2 5-2 7 0" />
        <path {...stroke} d="M18 15c2-2 5-2 7 0" />
      </svg>
    ),
  },
  {
    key: "ensopado",
    foto: imgEnsopado,
    titulo: "Ensopado / Guisado",
    descricao:
      "Cortes ricos em colágeno ou moídos. Refogue bem os temperos, acrescente o líquido aos poucos e cozinhe até o molho encorpar.",
    cortes: [
      { nome: "Músculo", nota: "referência para guisado encorpado" },
      { nome: "Acém", nota: "macio após 40–60 min de cozimento" },
      { nome: "Paleta", nota: "desfia com facilidade" },
      { nome: "Peito", nota: "bom para picadinhos com molho" },
      { nome: "Rabo bovino", nota: "molho encorpado e gelatinoso" },
      { nome: "Carne moída (patinho ou acém)", nota: "escolha 2ª passada para picadinho" },
      { nome: "Fraldinha em cubos" },
      { nome: "Ossobuco" },
    ],
    variacoes: ["Dobradinha", "Rabada", "Buchada de bode"],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <path {...stroke} d="M6 24h36a0 0 0 0 1 0 0 18 18 0 0 1-36 0Z" />
        <path {...stroke} d="M4 24h40" />
        <path {...stroke} d="M36 8l4 4-12 12-4-4Z" />
        <circle {...stroke} cx="16" cy="32" r="2" />
        <circle {...stroke} cx="24" cy="36" r="2" />
        <circle {...stroke} cx="32" cy="32" r="2" />
      </svg>
    ),
  },
  {
    key: "grelhado",
    foto: imgGrelhado,
    titulo: "Grelhado",
    descricao:
      "Cortes macios em bifes de 2 a 3 cm. Grelha bem quente, sele por poucos minutos de cada lado e evite virar mais que uma vez.",
    cortes: [
      { nome: "Contra filé", nota: "bife de chapa clássico" },
      { nome: "Picanha em bifes", nota: "capa de gordura vira crocante" },
      { nome: "Alcatra", nota: "macia e uniforme" },
      { nome: "Filé mignon", nota: "medalhões altos, ponto ao gosto" },
      { nome: "Coxão mole", nota: "bife tradicional do dia a dia" },
      { nome: "Maminha em bifes" },
      { nome: "Fraldinha em bifes altos" },
      { nome: "T-bone / Chorizo" },
      { nome: "Bife de fígado", nota: "grelhar rápido, não passar do ponto" },
    ],
    variacoes: ["Flat iron", "Denver steak", "Bife ancho", "Prime rib"],
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="h-8 w-8">
        <rect {...stroke} x="6" y="14" width="36" height="20" rx="2" />
        <path {...stroke} d="M6 20h36M6 26h36M6 32h36" />
        <path {...stroke} d="M14 34v4M34 34v4" />
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
            Toque em um preparo para ver os cortes recomendados e variações comuns.
          </p>
        </div>
      </header>

      <Accordion type="single" collapsible className="w-full">
        {DICAS.map((d) => (
          <AccordionItem key={d.key} value={d.key} className="border-border/70">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-1 items-center gap-3 pr-3 text-left">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted">
                  <img
                    src={d.foto}
                    alt={`Exemplo de ${d.titulo.toLowerCase()}`}
                    loading="lazy"
                    width={512}
                    height={512}
                    className="h-full w-full object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm [&_svg]:h-3.5 [&_svg]:w-3.5"
                  >
                    {d.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold leading-tight">{d.titulo}</h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {d.cortes.length} cortes recomendados
                    {d.variacoes?.length ? ` · ${d.variacoes.length} variações` : ""}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-[60px] pr-1">
                <p className="text-sm text-muted-foreground">{d.descricao}</p>

                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                    Cortes recomendados
                  </p>
                  <ul className="space-y-1.5">
                    {d.cortes.map((c) => (
                      <li
                        key={c.nome}
                        className="flex items-start gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-1.5"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground">{c.nome}</span>
                          {c.nota && (
                            <span className="ml-1.5 text-[12px] text-muted-foreground">
                              — {c.nota}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {d.variacoes && d.variacoes.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/70">
                      Variações e opções especiais
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {d.variacoes.map((v) => (
                        <span
                          key={v}
                          className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-foreground/80"
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
        Conteúdo cedido por <strong className="text-foreground">Recanto da Carne</strong>.
        Todos os direitos sobre as sugestões de preparo, marca e identidade
        visual pertencem ao estabelecimento. Reprodução apenas com autorização.
      </p>
    </section>
  );
}
