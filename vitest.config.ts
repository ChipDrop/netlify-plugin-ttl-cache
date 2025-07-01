// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // no JSDOM needed for a Netlify plugin
    globals: true, // gives you global describe/it/expect
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
