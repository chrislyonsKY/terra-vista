import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/terra-vista/' : '/',
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    strictPort: true,
    fs: {
      allow: ["../.."],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mapqc/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  define: {
    "import.meta.env.VITE_ARCGIS_API_KEY": JSON.stringify(process.env.ARCGIS_API_KEY ?? ""),
  },
  optimizeDeps: {
    include: ["laz-perf"],
  },
  worker: {
    format: "es",
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
