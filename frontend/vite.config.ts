import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
    // Unit tests exercise mock-mode code paths (mock simulator, demo accounts);
    // the real-API path is covered by the Playwright E2E suite.
    env: {
      VITE_ENABLE_MOCK_DATA: 'true',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts', 'framer-motion'],
          'vendor-flow': ['reactflow'],
          'vendor-monaco': ['monaco-editor', '@monaco-editor/react'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
