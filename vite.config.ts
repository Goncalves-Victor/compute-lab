import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base relativa: funciona em qualquer caminho do GitHub Pages (usuario.github.io/<repo>/)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
});
