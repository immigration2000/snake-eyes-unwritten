import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// GitHub Pages는 /<repo>/ 하위 경로로 서빙되므로 base를 맞춘다.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/snake-eyes-unwritten/" : "/",
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
});
