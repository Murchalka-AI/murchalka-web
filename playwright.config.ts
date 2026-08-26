import { defineConfig } from "@playwright/test";

const externalBaseUrl = process.env.MURCHALKA_E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:5173",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  webServer: externalBaseUrl === undefined ? {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  } : undefined,
});
