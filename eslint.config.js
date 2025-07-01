import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitestPlugin from 'eslint-plugin-vitest';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },

  ...tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    {
      files: ['src/**/*.ts'],
      languageOptions: { parserOptions: { project: './tsconfig.json' } },
    },
  ),

  /* ✅  Vitest rules for test files */
  {
    files: ['**/*.test.ts'],
    ...vitestPlugin.configs['flat/recommended'], // 👈 brings in env + rules
  },
];
