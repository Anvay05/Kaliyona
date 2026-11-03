import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  const resolvedGeminiKey =
    env.VITE_GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    '';
  const resolvedAnnaKey =
    env.VITE_ANNA_DEFAULT_KEY ||
    env.ANNA_DEFAULT_KEY ||
    process.env.VITE_ANNA_DEFAULT_KEY ||
    process.env.ANNA_DEFAULT_KEY ||
    '';

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(resolvedGeminiKey),
      'process.env.VITE_ANNA_DEFAULT_KEY': JSON.stringify(resolvedAnnaKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
