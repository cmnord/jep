import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./models/database.types";

let client: SupabaseClient;

declare global {
  var __client__: SupabaseClient;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new cache with every change either.
// in production we'll have a single cache.
if (process.env.NODE_ENV === "production") {
  client = initializeClient();
} else {
  if (!global.__client__) {
    global.__client__ = initializeClient();
  }
  client = global.__client__;
}

function initializeClient() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_URL or SUPABASE_ANON_KEY not found in process.env"
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export { client };
