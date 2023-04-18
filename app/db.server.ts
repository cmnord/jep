import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "~/models/database.types";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "~/utils";

let db: SupabaseClient<Database>;

declare global {
  var __db__: SupabaseClient<Database>;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new client with every change either.
// in production we'll have a single client.
if (process.env.NODE_ENV === "production") {
  db = initializeDB();
} else {
  if (!global.__db__) {
    global.__db__ = initializeDB();
  }
  db = global.__db__;
}

function initializeDB() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export { db };
