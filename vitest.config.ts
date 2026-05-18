import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./webview/__tests__/setup.ts'],
    include: [
      'webview/**/*.{test,spec}.{ts,tsx}',
      'extension/**/*.{test,spec}.ts',
      'shared/**/*.{test,spec}.ts',
    ],
    exclude: ['node_modules', 'dist', '__tests__/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'webview/hooks/**/*.{ts,tsx}',
        'webview/lib/**/*.{ts,tsx}',
        'webview/components/ErrorBoundary.tsx',
        'extension/counter/**/*.ts',
        'extension/report/**/*.ts',
        'extension/scanner/gitignore.ts',
        'extension/scanner/cache.ts',
      ],
      exclude: [
        'webview/**/*.d.ts',
        'webview/__tests__/**',
        'webview/main.tsx',
        'extension/**/*.test.ts',
        'extension/**/__tests__/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
