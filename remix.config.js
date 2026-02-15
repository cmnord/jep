/** @type {import('@remix-run/dev').AppConfig} */
export default {
  cacheDirectory: "./node_modules/.cache/remix",
  tailwind: true,
  ignoredRouteFiles: ["**/.*", "**/*.test.{ts,tsx}"],
  serverDependenciesToBundle: ["nanoid"],
  serverModuleFormat: "esm",
};
