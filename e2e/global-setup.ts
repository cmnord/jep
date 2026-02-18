import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const EMAIL = process.env.E2E_TEST_EMAIL ?? "playwright@test.local";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "test-password";

export default async function globalSetup() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create the auth user (or update password if already exists).
  // We use the admin API because supabase/config.toml has
  // enable_confirmations = true, so regular signup requires email verification.
  let userId: string;

  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });

  if (createError) {
    // User already exists — find them and update their password
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData.users.find((u) => u.email === EMAIL);
    if (!existing) {
      throw new Error(
        `Failed to create test user and could not find existing: ${createError.message}`,
      );
    }
    userId = existing.id;

    await supabase.auth.admin.updateUserById(userId, { password: PASSWORD });
  } else {
    userId = createData.user.id;
  }

  // Ensure the public.accounts row exists (required by the root loader's
  // getUserByEmail query).
  const { error: upsertError } = await supabase
    .from("accounts")
    .upsert({ id: userId, email: EMAIL }, { onConflict: "id" });

  if (upsertError) {
    throw new Error(
      `Failed to upsert accounts row: ${upsertError.message}`,
    );
  }

  console.log(`[global-setup] Test user ready: ${EMAIL} (${userId})`);
}
