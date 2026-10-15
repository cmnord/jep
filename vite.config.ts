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
      // Vercel imports the server directly, without our `varlock run` start
      // command. Include the resolved environment in its server-only bundle.
      varlockVitePlugin({
        ssrInjectMode: ENV.VERCEL === "1" ? "resolved-env" : "init-only",
        // React Router's virtual entry has no extension, so Varlock's
        // automatic entry detection does not recognize it.
        ssrEntryModuleIds: ["\0virtual:react-router/server-build"],
      }),
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
    ],
  };
});
