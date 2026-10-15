import assert from "node:assert/strict";

import { createRequestHandler } from "react-router";

// Vercel starts a fresh process without the blob supplied by `varlock run`.
// Keep this check outside Vitest, whose mocks can hide startup failures.
delete process.env.__VARLOCK_ENV;
const build = await import("../build/server/index.js");
const handleRequest = createRequestHandler(build, "production");

for (const path of ["/robots.txt", "/login"]) {
  const response = await handleRequest(new Request(`http://localhost${path}`));
  assert.equal(response.status, 200, `${path} must work on a cold start`);
  assert.ok((await response.text()).length > 0, `${path} must have a body`);
}

console.log("Server cold-start checks passed without varlock run.");
