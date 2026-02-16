import { flatRoutes } from "@remix-run/fs-routes";
import type { RouteConfig } from "@remix-run/route-config";

export default flatRoutes({
  ignoredRouteFiles: ["**/.*", "**/*.test.{ts,tsx}"],
}) satisfies Promise<RouteConfig>;
