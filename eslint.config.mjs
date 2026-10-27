import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "**/Ambiente de Impressão",
      "**/PrintHood",
      "**/Printers",
      "/C:/Users/tonlo/Ambiente de Impressão/",
      "src/generated/**"
    ]
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // ou "off" se quiser desativar
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];

export default eslintConfig;
