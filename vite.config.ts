import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Plain client-rendered SPA build — no TanStack Start, no nitro, no Cloudflare
// Workers target, no Lovable Cloud. The app is served as static files and talks
// to the standalone Node/Express API in ./backend over HTTP.
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 5173,
    proxy: {
      // Lets the frontend call fetch("/api/...") in dev without CORS,
      // forwarding to the backend started separately (npm run dev in ./backend).
      "/api": {
        target: process.env["VITE_API_PROXY_TARGET"] ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/api": {
        target: process.env["VITE_API_PROXY_TARGET"] ?? "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
