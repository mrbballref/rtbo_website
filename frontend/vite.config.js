import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const phpApiTarget = process.env.VITE_RTBO_PHP_API_TARGET || 'http://127.0.0.1:8099';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'react-vendor';
          }
          if (id.includes('/node_modules/')) {
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: phpApiTarget,
        changeOrigin: false,
        secure: false
      }
    }
  }
});
