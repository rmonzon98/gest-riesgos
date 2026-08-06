import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      Administracion: path.resolve(import.meta.dirname, "src/Administracion"),
      api: path.resolve(import.meta.dirname, "src/api"),
      context: path.resolve(import.meta.dirname, "src/context"),
      funciones: path.resolve(import.meta.dirname, "src/funciones"),
      images: path.resolve(import.meta.dirname, "src/images"),
      Login: path.resolve(import.meta.dirname, "src/Login"),
      PageNotFound: path.resolve(import.meta.dirname, "src/PageNotFound"),
      Riesgos: path.resolve(import.meta.dirname, "src/Riesgos"),
      Routes: path.resolve(import.meta.dirname, "src/Routes"),
      styles: path.resolve(import.meta.dirname, "src/styles"),
      theme: path.resolve(import.meta.dirname, "src/theme"),
      utils: path.resolve(import.meta.dirname, "src/utils"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/descargar": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/Pictures": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/docs": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "build",
  },
});
