import type { AuthSession } from "~/models/auth";
import { createEmailAuthAccount, deleteAuthAccount } from "~/models/auth";
import type { Database } from "~/models/database.types";
import { getSupabase, getSupabaseAdmin } from "~/supabase";

type User = Database["public"]["Tables"]["accounts"]["Row"];

/** getUserExistsByEmailWithoutSession bypasses RLS checks to see if the user
 * exists. This method is only used in signup.
 */
export async function getUserExistsByEmailWithoutSession(
  email: User["email"],
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("accounts")
    .select("*")
    .eq("email", email);

  if (error !== null) {
    throw new Error(error.message);
  }

  return data.length > 0;
}

export async function getUserByEmail(
  email: User["email"],
  accessToken: AuthSession["accessToken"],
) {
  const { data, error } = await getSupabase(accessToken)
    .from("accounts")
    .select("*")
    .eq("email", email);

  if (error !== null) {
    throw new Error(error.message);
  }

  return data.at(0);
}

async function createUser({
  email,
  userId,
}: Pick<AuthSession, "userId" | "email">) {
  const { error } = await getSupabase()
    .from("accounts")
    .insert({ email, id: userId });

  if (error !== null) {
    throw new Error(error.message);
  }

  return null;
}

async function tryCreateUser({
  email,
  userId,
}: Pick<AuthSession, "userId" | "email">) {
  try {
    return await createUser({
      userId,
      email,
    });
  } catch (error: unknown) {
    // user account created and have a session but unable to store in User table
    // we should delete the user account to allow retry create account again
    await deleteAuthAccount(userId);
    throw error;
  }
}

/** createUserAccount creates an auth account for this email, then
 * a user account for this email.
 *
 * It does not log the user in yet because they need to verify their email.
 */
export async function createUserAccount(email: string, password: string) {
  const authAccount = await createEmailAuthAccount(email, password);

  await tryCreateUser({ email, userId: authAccount.id });
}
