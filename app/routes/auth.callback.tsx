import { redirect } from "react-router";

import { createAuthSession, exchangeOAuthCode } from "~/models/auth";
import { ensureAccountExists } from "~/models/user/service.server";

import type { Route } from "./+types/auth.callback";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo") ?? "/";

  if (!code) {
    throw redirect("/login");
  }

  const authSession = await exchangeOAuthCode(code);
  if (!authSession) {
    throw redirect("/login");
  }

  await ensureAccountExists({
    userId: authSession.userId,
    email: authSession.email,
  });

  return createAuthSession({
    request,
    authSession,
    redirectTo,
  });
}
