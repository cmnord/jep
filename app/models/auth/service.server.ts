import { getSupabase, getSupabaseAdmin } from "~/supabase";
import { SUPABASE_URL } from "~/utils";

import { mapAuthSession } from "./mappers";
import type { AuthSession } from "./types";

/** createEmailAuthAccount signs up a user and sends them an email to confirm
 * their account.
 */
export async function createEmailAuthAccount(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signUp({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
  const user = data.user;
  if (!user) {
    throw new Error("No user returned after signup");
  }

  return user;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message === "Invalid login credentials") {
      return null;
    }
    throw new Error(error.message);
  }

  return mapAuthSession(data.session);
}

export function sendMagicLink(email: string) {
  return getSupabaseAdmin().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${SUPABASE_URL}/oauth/callback`,
    },
  });
}

export async function deleteAuthAccount(userId: string) {
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function getAuthAccountByAccessToken(accessToken: string) {
  const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);

  if (error) {
    throw new Error(error.message);
  }

  return data.user;
}

export async function refreshAccessToken(
  refreshToken?: string,
): Promise<AuthSession | null> {
  if (!refreshToken) return null;

  const { data, error } = await getSupabaseAdmin().auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) {
    console.error(error);
    return null;
  }

  if (!data.session) {
    return null;
  }

  return mapAuthSession(data.session);
}

export async function exchangeOAuthCode(
  code: string,
): Promise<AuthSession | null> {
  const { data, error } =
    await getSupabaseAdmin().auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("OAuth code exchange error:", error);
    return null;
  }

  return mapAuthSession(data.session);
}

export async function updateAuthPassword(
  accessToken: string,
  newPassword: string,
  refreshToken?: string,
) {
  const client = refreshToken ? getSupabase() : getSupabase(accessToken);

  if (refreshToken) {
    const { error: sessionError } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      throw new Error(sessionError.message);
    }
  }

  const { error } = await client.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateAuthEmail(
  accessToken: string,
  newEmail: string,
  refreshToken?: string,
) {
  const client = refreshToken ? getSupabase() : getSupabase(accessToken);

  if (refreshToken) {
    const { error: sessionError } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      throw new Error(sessionError.message);
    }
  }

  const { error } = await client.auth.updateUser({
    email: newEmail,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string,
) {
  const { error } = await getSupabaseAdmin().auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function verifyAuthSession(authSession: AuthSession) {
  const authAccount = await getAuthAccountByAccessToken(
    authSession.accessToken,
  );

  return Boolean(authAccount);
}
