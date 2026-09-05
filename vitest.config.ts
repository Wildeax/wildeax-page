import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
    },
  },
  test: {
    // node by default. Component tests opt into jsdom with a per-file
    // "// @vitest-environment jsdom" comment. Running the whole suite under
    // jsdom is memory-hungry enough to fall over on a loaded machine.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Polyfills PointerEvent and pointer capture, neither of which jsdom has.
    // Harmless under the node environment, where window is undefined.
    setupFiles: ['./src/test-setup.ts'],
  },
})
