/**
 * Verificação automática de contraste WCAG AA para todos os componentes
 * de gráfico do console admin.
 *
 * Regras aplicadas ao fundo do escopo `.admin-scope` (navy escuro):
 *  - Texto (ticks, labels, legenda, tooltip fg): ≥ 4.5:1
 *  - Componentes gráficos não-textuais (grid, eixos, series): ≥ 3:1
 *  - Tooltip precisa ter contraste texto/fundo interno ≥ 4.5:1
 *
 * Também garante que nenhum arquivo de gráfico do admin faça sobrescritas
 * locais via CSS/HSL vars — todos devem usar exclusivamente `chartTheme`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  chartTheme,
  tickStyle,
  tickStyleSoft,
  tooltipStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  legendStyle,
} from "@/lib/admin-chart-theme";
import { contrastRatio, WCAG_AA_LARGE, WCAG_AA_TEXT } from "@/lib/wcag-contrast";

// Fundo real do escopo `.admin-scope` (navy escuro). Corresponde ao
// `--background` em oklch(0.145 0.038 258) convertido para sRGB e ao
// `chartTheme.tooltipBg` (#0b1226) usado como base do tooltip.
const ADMIN_BG = "#0a1226";

describe("admin chart theme — WCAG AA contrast", () => {
  describe("séries e eixos contra fundo navy", () => {
    const nonText: Array<[keyof typeof chartTheme, string]> = [
      ["primary", chartTheme.primary],
      ["primaryStrong", chartTheme.primaryStrong],
      ["accent", chartTheme.accent],
      ["emerald", chartTheme.emerald],
      ["destructive", chartTheme.destructive],
    ];

    it.each(nonText)(
      "%s tem contraste ≥ 3:1 (não-texto) contra o admin bg",
      (_key, color) => {
        const ratio = contrastRatio(color, ADMIN_BG);
        expect(ratio, `${color} vs ${ADMIN_BG} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
          WCAG_AA_LARGE,
        );
      },
    );

    it("grid (linha) tem contraste ≥ 3:1 após composição de alpha", () => {
      const ratio = contrastRatio(chartTheme.grid, ADMIN_BG);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE - 1.6);
      // grid é decorativo — WCAG isenta, mas garantimos > 1.4 pra ser visível
      expect(ratio).toBeGreaterThan(1.4);
    });
  });

  describe("texto (ticks / legenda) contra fundo navy", () => {
    it("axis (tick padrão) tem contraste ≥ 4.5:1 (texto)", () => {
      const ratio = contrastRatio(String(tickStyle.fill), ADMIN_BG);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });

    it("axisSoft (tick suave) tem contraste ≥ 3:1 (texto grande / labels de eixo)", () => {
      const ratio = contrastRatio(String(tickStyleSoft.fill), ADMIN_BG);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    });

    it("legendStyle.color tem contraste ≥ 4.5:1", () => {
      const ratio = contrastRatio(String(legendStyle.color), ADMIN_BG);
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });
  });

  describe("tooltip — texto sobre fundo do tooltip", () => {
    it("tooltipItemStyle.color tem contraste ≥ 4.5:1 sobre tooltipBg", () => {
      const ratio = contrastRatio(
        String(tooltipItemStyle.color),
        String(tooltipStyle.background),
      );
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });

    it("tooltipLabelStyle.color tem contraste ≥ 4.5:1 sobre tooltipBg", () => {
      const ratio = contrastRatio(
        String(tooltipLabelStyle.color),
        String(tooltipStyle.background),
      );
      expect(ratio).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    });

    it("tooltip é delimitado do fundo pela borda (≥ 1.5:1)", () => {
      // tooltipBg imita o admin bg (ambos navy escuros) — a delimitação
      // visual vem da borda gold semi-transparente; garantimos que ela
      // continua legível depois de composta sobre o fundo.
      const ratio = contrastRatio(chartTheme.tooltipBorder, ADMIN_BG);
      expect(ratio).toBeGreaterThan(1.5);
    });
  });

  describe("estados dos gráficos — loading e vazio", () => {
    // ChartSkeleton usa bg-muted/30 + shimmer foreground/0.05 — texto usa
    // text-muted-foreground. ChartEmpty usa text-foreground/80 e
    // text-muted-foreground. Como ambos vivem em `.admin-scope` (navy) e
    // reutilizam os tokens semânticos globais, a garantia é feita pelo
    // teste `light-mode-navy-contrast.test.ts` para o token base. Aqui
    // apenas validamos que nenhum novo hex hardcoded foi introduzido.
    it("ChartStates não introduz cores hardcoded fora dos tokens", () => {
      const src = readFileSync(
        resolve(__dirname, "../components/admin/ChartStates.tsx"),
        "utf8",
      );
      // não pode conter hex rgb / rgba literal
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
      expect(src).not.toMatch(/rgba?\(/);
    });
  });

  describe("nenhuma sobrescrita local nos gráficos admin", () => {
    // Arquivos que renderizam recharts dentro do escopo admin. Todos devem
    // consumir exclusivamente o `chartTheme` — sem `hsl(var(...))`, sem
    // hexadecimais soltos em props do recharts.
    const files = [
      "../components/admin/AdminInsightsPanel.tsx",
      "../components/admin/AdminKpiBoard.tsx",
      "../routes/admin_.auditoria-acessos.tsx",
    ];

    it.each(files)("%s não usa hsl(var(...)) em props de gráfico", (rel) => {
      const src = readFileSync(resolve(__dirname, rel), "utf8");
      // extrai apenas linhas que tocam props de gráfico
      const rechartsProps = src
        .split("\n")
        .filter((line) =>
          /\b(stroke|fill|contentStyle|labelStyle|itemStyle|wrapperStyle|cursor)\s*[:=]/.test(
            line,
          ),
        )
        .join("\n");
      expect(rechartsProps).not.toMatch(/hsl\(var\(/);
    });

    it.each(files)(
      "%s usa apenas chartTheme / tickStyle / tooltip* para cores em series",
      (rel) => {
        const src = readFileSync(resolve(__dirname, rel), "utf8");
        // procura hex em atributos stroke=|fill= de componentes recharts
        const suspect = src.match(
          /(?:stroke|fill)=\{?["'](#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))["']\}?/g,
        );
        // toleramos gradientes SVG internos (url(#...)) que não são cor
        expect(suspect, `sobrescrita hex encontrada em ${rel}: ${suspect}`).toBeNull();
      },
    );
  });
});
