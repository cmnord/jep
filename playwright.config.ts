import { defineConfig, devices } from "@playwright/test";

const useDevServer = process.env.PW_USE_DEV_SERVER === "1";
const host = process.env.HOST ?? "127.0.0.1";
const port = process.env.PORT ?? "3000";
const webServerCommand = useDevServer
  ? "npm run dev"
  : `HOST=${host} PORT=${port} node -r dotenv/config node_modules/.bin/react-router-serve ./build/server/index.js`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",

  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: webServerCommand,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
