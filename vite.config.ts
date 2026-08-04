import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  root: "src/renderer",
  build: { outDir: "../../dist/renderer", emptyDirOnBuild: true },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/renderer/src"),
      "@bot": path.resolve(__dirname, "src/bot"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
