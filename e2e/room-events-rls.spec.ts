import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "../app/models/database.types";

const anon = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

test("the browser key cannot insert room events", async () => {
  const { data: room } = await anon
    .from("rooms")
    .select("id")
    .limit(1)
    .maybeSingle();

  const { error } = await anon.from("room_events").insert({
    room_id: room?.id ?? 1,
    type: "buzz",
    payload: { userId: "forged", i: 0, j: 0, deltaMs: 0 },
  });

  expect(error?.code).toBe("42501");
});
