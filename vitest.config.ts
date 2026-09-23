import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      // Fuera de Next, "server-only" lanza al importarse; en pruebas es un módulo vacío.
      'server-only': resolve(import.meta.dirname, 'tests/vacio.ts'),
    },
  },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60_000 },
})
