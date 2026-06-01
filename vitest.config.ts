import { defineConfig } from 'vitest/config'

// Tests unitarios (vitest). Los E2E viven en tests/e2e y los corre Playwright
// (pnpm test:e2e), así que los excluimos acá para no mezclarlos.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'tests/e2e/**', '.next'],
  },
})
