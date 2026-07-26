import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guarda de regressão tipográfica: impede que novas telas voltem a usar
 * `text-[Npx]` abaixo do piso de legibilidade (11px) ou classes utilitárias
 * minúsculas do Tailwind. Use os tokens de `src/lib/typeclear.ts`.
 */
const MIN_PX = 11;
const ROOT = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("Piso tipográfico do código-fonte", () => {
  const files = walk(ROOT);

  it("nenhum arquivo declara fonte abaixo de 11px", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
        if (Number(m[1]) < MIN_PX) {
          offenders.push(`${file.replace(process.cwd() + "/", "")}: ${m[0]}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("nenhum arquivo usa text-[2xs]/text-\\[0.6rem\\] e similares", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/text-\[(0?\.\d+)rem\]/g)) {
        if (Number(m[1]) * 16 < MIN_PX) {
          offenders.push(`${file.replace(process.cwd() + "/", "")}: ${m[0]}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
