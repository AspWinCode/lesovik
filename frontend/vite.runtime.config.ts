import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Production build for the App Runtime (/runtime bundle — end-user-facing)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@runtime": resolve(__dirname, "src/runtime"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    outDir: "dist/runtime",
    rollupOptions: {
      input: resolve(__dirname, "src/runtime/index.html"),
    },
    chunkSizeWarningLimit: 600,
  },
});
