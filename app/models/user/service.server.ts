import { db } from "~/db.server";
import type { AuthSession } from "~/models/auth";
import {
  createEmailAuthAccount,
  deleteAuthAccount,
  signInWithEmail,
} from "~/models/auth";
import type { Database } from "~/models/database.types";

type User = Database["public"]["Tables"]["accounts"]["Row"];

export async function getUserByEmail(email: User["email"]) {
  const { data, error } = await db
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
  const { data, error } = await db
    .from("accounts")
    .insert({ email, id: userId })
    .select();

  if (error !== null) {
    throw new Error(error.message);
  }

  const user = data.at(0);
  if (!user) {
    throw new Error("user not created");
  }
  return user;
}

export async function tryCreateUser({
  email,
  userId,
}: Pick<AuthSession, "userId" | "email">) {
  const user = await createUser({
    userId,
    email,
  });

  // user account created and have a session but unable to store in User table
  // we should delete the user account to allow retry create account again
  if (!user) {
    await deleteAuthAccount(userId);
    return null;
  }

  return user;
}

export async function createUserAccount(
  email: string,
  password: string
): Promise<AuthSession | null> {
  const authAccount = await createEmailAuthAccount(email, password);

  // ok, no user account created
  if (!authAccount) return null;

  const authSession = await signInWithEmail(email, password);

  // user account created but no session 😱
  // we should delete the user account to allow retry create account again
  if (!authSession) {
    await deleteAuthAccount(authAccount.id);
    return null;
  }

  const user = await tryCreateUser(authSession);

  if (!user) return null;

  return authSession;
}
