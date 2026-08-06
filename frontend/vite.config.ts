import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import type { Plugin } from "vite";

function redirectRootPlugin(): Plugin {
  return {
    name: "redirect-root",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Mirror nginx: bare "/" → "/editor/" so BrowserRouter basename="/editor" works
        // Skip WebSocket upgrade requests (Vite HMR)
        if (req.url === "/" && !req.headers.upgrade) {
          res.writeHead(302, { Location: "/editor/" });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

// Dev server — serves both /editor and /runtime via a single dev server
export default defineConfig({
  plugins: [react(), redirectRootPlugin()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@editor": resolve(__dirname, "src/editor"),
      "@runtime": resolve(__dirname, "src/runtime"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test-setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["src/api/generated/**", "**/*.d.ts"],
    },
  },
});
