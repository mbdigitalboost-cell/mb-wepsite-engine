import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Fontlar self-hosted: next/font/google derleme anında Google Fonts'tan
  // indirir; indirme düşünce üretim derlemesi düşüyordu. Yeni font
  // lib/fonts/store-fonts.ts'e (next/font/local) eklenir.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/font/google",
              message: "Fontlar self-hosted: lib/fonts/store-fonts.ts (next/font/local) kullanın. next/font/google derlemeyi Google Fonts'a bağlar.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
