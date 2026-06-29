// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import unicorn from "eslint-plugin-unicorn";

export default defineConfig({
  files: ["**/*.{[jt]s,[mc]js}"],
  ignores: ["dist/"],
  extends: [
    js.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    unicorn.configs.recommended,
  ],
  rules: {
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "unicorn/name-replacements": "warn",
    "unicorn/filename-case": ["error", { ignore: ["^__tests__$"] }],
    "unicorn/max-nested-calls": "warn",
    "unicorn/consistent-boolean-name": "warn",
    "unicorn/no-null": "warn",
    "unicorn/no-unreadable-for-of-expression": "warn",
  },
});
