import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { varlockVitePlugin } from "@varlock/vite-integration";
import { ENV } from "varlock/env";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  const port = parseInt(new URL(ENV.BASE_URL).port);

  return {
    server: { port },
    optimizeDeps: {
      include: ["@vercel/analytics/react"],
    },
    plugins: [
      varlockVitePlugin({ ssrInjectMode: "init-only" }),
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
    ],
  };
});
