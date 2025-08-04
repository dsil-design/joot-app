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
    rules: {
      // Turn unused vars into warnings instead of errors for development
      "@typescript-eslint/no-unused-vars": "warn",
      
      // Allow some flexibility with 'any' type (warnings only)
      "@typescript-eslint/no-explicit-any": "warn",
      
      // Allow unescaped entities (common in React)
      "react/no-unescaped-entities": "off",
      
      // Be more lenient with console statements during development
      "no-console": "warn",
      
      // Allow empty functions (common in development)
      "@typescript-eslint/no-empty-function": "warn"
    }
  }
];

export default eslintConfig;