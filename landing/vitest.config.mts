import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // tsconfig keeps `jsx: preserve` for Next; tests need JSX compiled
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    // lib/ tests run in node; component tests opt into jsdom with a
    // `// @vitest-environment jsdom` docblock at the top of the file
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
  },
});
