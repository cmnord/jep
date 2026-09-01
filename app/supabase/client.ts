import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "varlock/env";

import { AuthSession } from "~/models/auth";
import type { Database } from "~/models/database.types";
import { isBrowser } from "~/utils";

// Cache the browser-side client to avoid multiple GoTrueClient instances.
let browserClient: SupabaseClient<Database> | undefined;
let browserClientToken: string | undefined;

export function getSupabaseClient(supabaseKey: string, accessToken?: string) {
  if (isBrowser && browserClient && browserClientToken === accessToken) {
    return browserClient;
  }

  const global = accessToken
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }
    : {};

  const client = createClient<Database>(ENV.SUPABASE_URL, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 5,
      },
    },
    ...global,
  });

  if (isBrowser) {
    browserClient = client;
    browserClientToken = accessToken;
  }

  return client;
}

/**
 * Provides a Supabase Client for the logged in user or get back a public and safe client without admin privileges
 *
 * It's a per request scoped client to prevent access token leaking over multiple concurrent requests and from different users.
 *
 * Reason : https://github.com/rphlmr/supa-fly-stack/pull/43#issue-1336412790
 */
function getSupabase(accessToken?: AuthSession["accessToken"]) {
  return getSupabaseClient(ENV.SUPABASE_ANON_KEY, accessToken);
}

export { getSupabase };
