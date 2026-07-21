import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { HighlightMatch } from "@/components/search/HighlightMatch";
import { tokenizeQuery } from "@/lib/search-tokens";

describe("HighlightMatch (strict — default)", () => {
  it("destaca palavra inteira acento-insensível preservando o texto original", () => {
    const { container } = render(
      <HighlightMatch text="Açaí orgânico" tokens={["acai"]} />,
    );
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe("Açaí");
    expect(container.textContent).toBe("Açaí orgânico");
  });

  it("NÃO destaca 'sal' dentro de 'salsicha' (strict)", () => {
    const { container } = render(
      <HighlightMatch text="Salsicha Sadia" tokens={["sal"]} />,
    );
    expect(container.querySelectorAll("mark").length).toBe(0);
  });

  it("destaca 'sal' em 'Sal Grosso'", () => {
    const { container } = render(
      <HighlightMatch text="Sal Grosso" tokens={["sal"]} />,
    );
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe("Sal");
  });

  it("tokens vazios: não envolve nada", () => {
    const { container } = render(<HighlightMatch text="Arroz" tokens={[]} />);
    expect(container.querySelectorAll("mark").length).toBe(0);
    expect(container.textContent).toBe("Arroz");
  });

  it("stopword na query não gera highlight", () => {
    // A tokenização remove 'de'; o consumidor passa tokens tokenizados.
    const tokens = tokenizeQuery("de leite");
    const { container } = render(
      <HighlightMatch text="Leite integral com creme de leite" tokens={tokens} />,
    );
    const marks = Array.from(container.querySelectorAll("mark")).map(
      (m) => m.textContent,
    );
    expect(marks.every((m) => m?.toLowerCase() === "leite")).toBe(true);
    expect(marks.length).toBe(2); // "Leite" e "leite" — 'de' NÃO deve virar mark
  });

  it("múltiplos tokens: destaca todos", () => {
    const { container } = render(
      <HighlightMatch text="Arroz Tio João" tokens={["arroz", "tio"]} />,
    );
    const marks = Array.from(container.querySelectorAll("mark")).map(
      (m) => m.textContent,
    );
    expect(marks).toEqual(["Arroz", "Tio"]);
  });
});

describe("HighlightMatch (loose)", () => {
  it("token curto ≥ 3 chars casa como prefixo", () => {
    const { container } = render(
      <HighlightMatch text="Arroz branco" tokens={["arr"]} mode="loose" />,
    );
    const marks = container.querySelectorAll("mark");
    expect(marks.length).toBe(1);
    expect(marks[0].textContent).toBe("Arr");
  });

  it("loose ainda respeita fronteira de palavra no início", () => {
    const { container } = render(
      <HighlightMatch text="Casarroz" tokens={["arr"]} mode="loose" />,
    );
    // 'arr' está no meio de 'Casarroz' — sem word-boundary no início.
    expect(container.querySelectorAll("mark").length).toBe(0);
  });
});
