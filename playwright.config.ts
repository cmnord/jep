import { defineConfig, devices } from "@playwright/test";

const useDevServer = process.env.PW_USE_DEV_SERVER === "1";
const host = process.env.HOST ?? "127.0.0.1";
const port = process.env.PORT ?? "3000";
const webServerCommand = useDevServer
  ? "pnpm dev"
  : `HOST=${host} PORT=${port} react-router-serve ./build/server/index.js`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The suite shares an account and database; serialize it without file filters.
  workers: 1,
  reporter: process.env.CI ? "github" : "html",

  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },

  webServer: {
    command: webServerCommand,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
