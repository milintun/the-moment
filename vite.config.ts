/// <reference types="vitest/config" />
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  root: "web",
  plugins: [vue()],
  // Serve on the address the backend's publicOrigin expects, and forward API calls to it.
  server: {
    host: "127.0.0.1",
    port: 8080,
    strictPort: true,
    // "/api/" with the slash: a bare "/api" prefix would also catch the module /api.ts.
    proxy: { "/api/": process.env.BACKEND_URL ?? "http://127.0.0.1:3000" },
  },
  build: { outDir: "dist", emptyOutDir: true },
  // Frontend unit and component tests (`bun run test:web`), in a simulated browser.
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "happy-dom",
    environmentOptions: { happyDOM: { url: "http://127.0.0.1:8080/" } },
    setupFiles: ["tests/setup.ts"],
  },
});
