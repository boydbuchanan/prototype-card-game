import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Constant in dev and prod, so import.meta.env.BASE_URL is identical in both
  // and a base-path mistake shows up locally instead of only on GitHub Pages.
  base: "/prototype-card-game/",
  plugins: [react(), tsconfigPaths()],
  build: {
    // The gh-pages script and the deploy workflow both publish ./build.
    outDir: "build",
  },
  test: {
    environment: "jsdom",
    // The app is served from BASE_URL and the Router's basename is BASE_URL, so
    // jsdom has to sit under it too or every route falls outside the basename.
    environmentOptions: { jsdom: { url: "http://localhost/prototype-card-game/" } },
    setupFiles: "src/setupTests.ts",
    globals: true,
  },
});
