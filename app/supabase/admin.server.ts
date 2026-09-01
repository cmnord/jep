import { ENV } from "varlock/env";

import { getSupabaseClient } from "./client";

/**
 * Provides a Supabase client with full admin privileges.
 *
 * It is scoped to each call so authentication state cannot leak across
 * concurrent requests or between users.
 *
 * Reason: https://github.com/rphlmr/supa-fly-stack/pull/43#issue-1336412790
 */
export function getSupabaseAdmin() {
  return getSupabaseClient(ENV.SUPABASE_SERVICE_ROLE_KEY);
}
