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

  // Specs that hit the shared database (auth, uploads, real rooms) are
  // split into their own project that runs after the solo-game specs and
  // without intra-file parallelism, so they don't race each other or the
  // mock-game specs for the shared server and Supabase instance.
  projects: [
    {
      name: "solo",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /(auth|solves|game-management|settings)\.spec\.ts/,
    },
    {
      name: "db",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /(auth|solves|game-management|settings)\.spec\.ts/,
      dependencies: ["solo"],
      // These specs share one test user and one database, so they cannot
      // run concurrently with each other.
      workers: 1,
      fullyParallel: false,
    },
  ],

  webServer: {
    command: webServerCommand,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
