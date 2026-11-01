import { readdir } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../app/models/database.types";

/**
 * Fail Vercel production builds whose database is missing a repo migration.
 * Vercel deploys main on merge, so app code that depends on a migration must
 * not go live before `pnpm db:push`. A failed build keeps the previous
 * deployment serving. Migrations must therefore stay compatible with the code
 * that is already deployed.
 *
 * Reads the build's own SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the
 * process environment, which Vercel provides at build time.
 */
const { VERCEL, VERCEL_ENV } = process.env;
if (VERCEL === "1" && !VERCEL_ENV) {
  // Without VERCEL_ENV a production build would skip the check silently.
  console.error(
    "VERCEL_ENV is not set. Enable Vercel's system environment variables.",
  );
  process.exit(1);
}
if (VERCEL_ENV !== "production") {
  console.log("Skipping migration check outside Vercel production builds.");
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

const migrationsDir = new URL("../supabase/migrations/", import.meta.url);
const repoVersions = (await readdir(migrationsDir))
  .map((file) => /^(\d+)_.+\.sql$/.exec(file)?.[1])
  .filter((version) => version !== undefined)
  .sort();

const client = createClient<Database>(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await client.rpc("applied_migrations");
const host = new URL(url).host;
if (error) {
  // The function arrives in 20261101090000_applied_migrations.sql, so a missing
  // function means the database is behind. Never deploy without verifying.
  console.error(
    `Could not read applied migrations from ${host}: ${error.message}`,
  );
  console.error("Apply pending migrations with `pnpm db:push`, then redeploy.");
  process.exit(1);
}
const applied = new Set(data);
const missing = repoVersions.filter((version) => !applied.has(version));
if (missing.length) {
  console.error(`${host} is missing migrations: ${missing.join(", ")}`);
  console.error(
    "Apply them with `pnpm db:push`, then redeploy. The current production deployment keeps serving until a build succeeds.",
  );
  process.exit(1);
}
console.log(`All ${repoVersions.length} migrations are applied to ${host}.`);
