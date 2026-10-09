import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const defaultServerUrl =
    process.env.VITE_FRIDAY_SERVER_URL ||
    process.env.APP_URL ||
    'https://ais-dev-y34kxoace7g7txsixtaqn5-87869525848.asia-southeast1.run.app';

  return {
    base: './',
    define: {
      'import.meta.env.VITE_FRIDAY_SERVER_URL': JSON.stringify(defaultServerUrl),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
