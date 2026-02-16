import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const baseUrl =
    env.BASE_URL || process.env.BASE_URL || "http://localhost:3000";
  const port = parseInt(new URL(baseUrl).port);

  return {
    server: { port },
    optimizeDeps: {
      include: ["@vercel/analytics/react"],
    },
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  };
});
