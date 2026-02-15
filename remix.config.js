/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  cacheDirectory: "./node_modules/.cache/remix",
  tailwind: true,
  ignoredRouteFiles: ["**/.*", "**/*.test.{ts,tsx}"],
  serverDependenciesToBundle: ["nanoid"],
  serverModuleFormat: "cjs",
};
