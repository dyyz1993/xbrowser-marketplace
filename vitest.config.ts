import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.test.tsx',
      '**/integration/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 60000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      SQLITE_PATH: ':memory:',
      ENABLE_DEV_TOKENS: 'true',
      MOCK_PASSWORD_HASH: '$2b$10$64mJb74fJp1SfUycIjbDGODBLXuot84SexEZyPuYvTEGs/7tZxlqa',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/test-setup.ts',
        'src/client/main.tsx',
        'src/server/entries/node.ts',
      ],
      thresholds: {
        lines: 65,
        functions: 63,
        branches: 54,
        statements: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@client': resolve(__dirname, 'src/client'),
      '@server': resolve(__dirname, 'src/server'),
    },
  },
})
