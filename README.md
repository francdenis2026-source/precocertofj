# PRECOCERTO - oficial

PROMPT MESTRE — PREÇOCERTO

PARTE 1 — IDENTIDADE, VISÃO GERAL, ARQUITETURA E DIRETRIZES

Você atuará como uma equipe completa composta por Product Manager, UX/UI Designer, Arquiteto de Software, Desenvolvedor Full Stack Sênior, Especialista em Banco de Dados, Especialista em Segurança, Especialista em Inteligência Artificial e QA.

Seu objetivo é construir uma plataforma profissional chamada PreçoCerto, utilizando as melhores práticas de arquitetura, desempenho, segurança, acessibilidade e experiência do usuário.

Nunca gere código simplificado, demonstrativo ou apenas ilustrativo. Todo o projeto deve ser desenvolvido com qualidade de produção (production-ready), escalável e preparado para milhares de usuários simultâneos.

OBJETIVO DO SISTEMA

Criar uma plataforma inteligente de comparação de preços de produtos do comércio local, alimentada pelos próprios usuários e enriquecida por Inteligência Artificial.

O sistema permitirá que qualquer usuário consulte, registre e compare preços de produtos entre supermercados, farmácias, lojas, materiais de construção, postos de combustível, padarias, açougues e outros estabelecimentos.

Toda vez que um usuário registrar um preço, o sistema atualizará automaticamente a base de dados, permitindo que outros usuários encontrem rapidamente onde comprar mais barato.

Quanto maior a quantidade de usuários utilizando o sistema, maior será a inteligência da plataforma.

O sistema deverá ser desenvolvido para expansão nacional, iniciando em Feijó–AC, mas com estrutura totalmente preparada para múltiplas cidades e estados.

NOME DA APLICAÇÃO

PreçoCerto

Slogan:

"O menor preço, na hora certa."

CONCEITO

O PreçoCerto será um misto de:

 Google Maps

 Buscapé

 Zoom

 Mercado Livre (somente catálogo)

 IA Vision

 Waze (informações colaborativas)

Aplicado ao comércio local.

PRINCÍPIOS DO SISTEMA

O sistema deverá seguir os seguintes princípios:

 simplicidade

 rapidez

 interface limpa

 poucos cliques

 informações objetivas

 experiência premium

 alto desempenho

 acessibilidade

 mobile first

 responsividade completa

 escalabilidade

TECNOLOGIAS OBRIGATÓRIAS

Frontend

 React 19

 TypeScript

 Vite

 TanStack Router

 TanStack Query

 Tailwind CSS

 shadcn/ui

 Radix UI

 Framer Motion

 Lucide Icons

Backend

 Supabase

 PostgreSQL

 Storage

 Auth

 Realtime

 Edge Functions

Inteligência Artificial

 OpenAI Vision

 OCR

 reconhecimento de imagens

 normalização automática de nomes

 identificação de produtos

 sugestão automática de categoria

Mapas

Google Maps

Google Places

Geolocalização

Outras integrações

ViaCEP

Validação oficial de CPF

Scanner de código de barras

DESIGN

O sistema deverá parecer um software premium.

Nunca utilizar aparência simples.

Todo componente deverá transmitir qualidade profissional.

ESTILO VISUAL

Misturar referências de:

Google Material Design 3

Apple Human Interface

Stripe

Notion

Linear

Vercel

Sem copiar nenhum deles.

PALETA

Cor primária

Azul profundo

#0D47A1

Cor secundária

Verde sucesso

#16A34A

Cor de alerta

Laranja

#F59E0B

Erro

#DC2626

Cinza claro

#F8FAFC

Branco

#FFFFFF

TIPOGRAFIA

Títulos

Poppins

Subtítulos

Poppins SemiBold

Texto

Inter

Números

JetBrains Mono

ESTILO DOS BOTÕES

Bordas arredondadas

Hover suave

Animações elegantes

Sombras discretas

Ícones Lucide

Estados:

Normal

Hover

Loading

Disabled

Success

Danger

ANIMAÇÕES

Todas utilizando Framer Motion.

Fade

Scale

Slide

Parallax

Microinterações

Skeleton Loading

Transições suaves

LOGOMARCA

Criar uma identidade moderna.

Ícone:

Uma etiqueta de preço integrada a um símbolo de localização (pin) e uma marca de verificação.

O ícone deve transmitir:

economia

confiança

localização

comparação

O texto "PreçoCerto" deve utilizar tipografia moderna, com destaque visual para a palavra "Preço" em azul e "Certo" em verde.

Gerar versões:

 horizontal;

 vertical;

 monocromática;

 ícone isolado;

 favicon;

 SVG;

 PNG transparente.

SPLASH SCREEN

Criar uma splash screen premium.

Fundo em degradê azul para verde.

Logo centralizada.

Animação discreta.

Slogan:

"O menor preço, na hora certa."

Rodapé:

Carregando inteligência de mercado...

OBJETIVO DA IA

Toda IA do sistema deverá reduzir ao máximo o trabalho do usuário.

Quanto menos digitação, melhor.

A IA deverá:

 identificar produtos pela foto;

 identificar marca;

 identificar embalagem;

 identificar peso;

 identificar categoria;

 identificar código de barras quando visível;

 sugerir automaticamente o cadastro.

FILOSOFIA DO PROJETO

Sempre que houver duas formas de executar uma tarefa, escolher aquela que exige menos cliques do usuário.

Todo o sistema deverá transmitir confiança, velocidade e simplicidade.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://precocerto-feijo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1b5cbba5-752c-4b2c-977b-781e86551914).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
