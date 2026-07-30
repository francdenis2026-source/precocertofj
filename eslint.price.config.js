/**
 * Config de lint dedicada ao design system de preços.
 *
 * Roda apenas UMA regra (`no-restricted-syntax`) para que possa ser usada como
 * gate de CI barato e sem ruído: `bun run lint:price`.
 *
 * Regra: nenhum preço visual pode ser renderizado com brl()/fmt()/formatBRL().
 * Use <Price value={reais} /> ou <PriceCents cents={centavos} />.
 */
import tseslint from "typescript-eslint";

export const PRICE_RULE = [
  "error",
  {
    selector:
      ":matches(JSXElement, JSXFragment) > JSXExpressionContainer > CallExpression[callee.name=/^(brl|fmt|fmtBRL|formatBRL|formatCents|formatPrice|formatMoney|currency)$/]",
    message:
      "Preço visual deve usar <Price value={...} /> (ou <PriceCents cents={...} />) em vez de brl()/fmt()/formatBRL(). Se o valor não for monetário (ex.: data), renomeie o helper (fmtDateTime) ou adicione eslint-disable-next-line explicando.",
  },
];

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  languageOptions: { parser: tseslint.parser },
  rules: { "no-restricted-syntax": PRICE_RULE },
});
