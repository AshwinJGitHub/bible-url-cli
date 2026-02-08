// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  // Ignore build output and fixtures
  { ignores: ["dist/", "tests/fixtures/"] },

  // Base ESLint recommended
  eslint.configs.recommended,

  // TypeScript type-checked rules
  ...tseslint.configs.recommendedTypeChecked,

  // Parser options for type-aware linting
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Project-specific rule overrides
  {
    rules: {
      // Allow console.log in CLI entry point
      "no-console": "off",
      // Allow unused vars starting with _ (common convention)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Permit non-null assertions where justified (e.g., indexed access after bounds check)
      "@typescript-eslint/no-non-null-assertion": "warn",
    },
  },

  // Prettier must be last to override formatting-related rules
  eslintConfigPrettier,
);
