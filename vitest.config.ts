import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Tests unitarios (vitest). Los E2E viven en tests/e2e y los corre Playwright
// (pnpm test:e2e), así que los excluimos acá para no mezclarlos.
export default defineConfig({
  // Espeja el path alias de tsconfig (@/* → src/*) para que los tests resuelvan
  // los mismos imports que la app (ej. @/lib/cards/photo-layout).
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'tests/e2e/**', '.next'],
  },
})
