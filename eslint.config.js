import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      /**
       * Design system: preço visual só pode ser renderizado pelo componente
       * <Price /> (ou <PriceCents /> para valores em centavos).
       *
       * A regra bloqueia apenas chamadas de formatação monetária dentro de
       * JSX (`{brl(x)}`), que é onde a tipografia Oswald/tabular-nums se
       * perde. Continua permitido usar essas funções em aria-labels, toasts,
       * tickFormatter de gráficos e exportações — ali o valor é string.
       */
      "no-restricted-syntax": [
        "error",
        {
          // Apenas conteúdo de JSX (texto renderizado). Atributos como
          // aria-label={`... ${brl(x)}`} continuam livres, pois ali o valor
          // precisa mesmo ser string.
          selector:
            ":matches(JSXElement, JSXFragment) > JSXExpressionContainer > CallExpression[callee.name=/^(brl|fmt|fmtBRL|formatBRL|formatCents|formatPrice|formatMoney|currency)$/]",
          message:
            "Preço visual deve usar <Price value={...} /> (ou <PriceCents cents={...} />) em vez de brl()/fmt()/formatBRL(). Se o valor não for monetário (ex.: data), renomeie o helper ou adicione um eslint-disable-next-line explicando.",
        },
      ],


    },
  },
  eslintPluginPrettier,
);
