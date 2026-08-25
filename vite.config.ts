import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    command === "serve" && {
      name: "development-content-security-policy",
      transformIndexHtml(html) {
        return html
          .replace("connect-src ws://127.0.0.1:* ws://[::1]:*;", "connect-src ws://127.0.0.1:* ws://[::1]:* ws://localhost:*;")
          .replace("style-src 'self';", "style-src 'self' 'unsafe-inline';");
      },
    },
  ],
  build: {
    outDir: "dist",
  },
  test: {
    environment: "node",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
}));
