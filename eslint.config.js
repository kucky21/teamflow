// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    'apps/api/src/generated/**',
    'apps/web/public/**',
  ]),

  // Základ pro všechny JS/TS soubory.
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      eqeqeq: ['error', 'always'],
      // Pořadí importů: side-effect → node: → balíčky → alias @/ → relativní.
      'simple-import-sort/imports': [
        'error',
        { groups: [[String.raw`^\u0000`], ['^node:'], [String.raw`^@?\w`], ['^@/'], [String.raw`^\.`]] },
      ],
      'simple-import-sort/exports': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'object-shorthand': 'error',
      'prefer-template': 'error',
    },
  },

  // TypeScript – typově informovaná pravidla (strict + stylistic).
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `description || null` záměrně převádí prázdný řetězec na null; `disabled || loading` musí zůstat `||`.
      '@typescript-eslint/prefer-nullish-coalescing': ['error', { ignorePrimitives: { string: true, boolean: true } }],
      // `onClick={() => setOpen(false)}` je idiomatický React, nikoliv chyba.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // Fastify pluginy jsou z definice async, i když uvnitř nic neawaitují.
      '@typescript-eslint/require-await': 'off',
      // `onSubmit={form.handleSubmit(...)}` – React event handlery promise ignorují záměrně.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],
    },
  },

  // Testy pracují s netypovanými JSON odpověďmi a záměrně s non-null asercemi.
  {
    files: ['**/*.test.{ts,tsx}', 'apps/api/test/**/*.ts', 'apps/web/e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // CLI skripty (seed) smějí psát na stdout.
  {
    files: ['apps/api/src/seed/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  // Frontend.
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      'no-console': 'error',
    },
  },

  // Čisté JS konfigurační soubory nejsou součástí žádného tsconfig projektu.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  prettier,
]);
